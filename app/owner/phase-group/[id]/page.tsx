'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';
import PipelineOrderList, { PhaseGroup, fmtPrice } from '@/components/shared/PipelineOrderCard';
import OrderDetailSheet from '@/components/shared/OrderDetailSheet';

export default function PhaseGroupPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup]             = useState<PhaseGroup | null>(null);
  const [orders, setOrders]           = useState<PipelineOrder[]>([]);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [phaseGroups, setPhaseGroups] = useState<PhaseGroup[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [detailOrder, setDetailOrder] = useState<PipelineOrder | null>(null);
  const [bulkMode, setBulkMode]       = useState(false);
  const [bulkPhase, setBulkPhase]     = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [noteFilter, setNoteFilter]   = useState(false);
  const [toast, setToast]             = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/phase-groups').then(r => r.json()),
      fetch('/api/pipeline/orders').then(r => r.json()),
    ])
      .then(([groups, ords]) => {
        if (!Array.isArray(groups)) { setError('Failed to load phase groups'); return; }
        if (!Array.isArray(ords))   { setError(ords?.error ?? 'Failed to load orders'); return; }
        setPhaseGroups(groups);
        const g = groups.find((g: PhaseGroup) => g.id === id);
        if (!g) { setError('Phase group not found'); return; }
        setGroup(g);
        if (g.phases.length > 0) setActivePhase(g.phases[0]);
        setOrders(ords);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePhaseChange(orderId: number, liId: number, phase: string) {
    const prev = orders.find(o => o.id === orderId)?.lineItems.find(li => li.id === liId)?.phase ?? '';
    setOrders(os => os.map(o =>
      o.id !== orderId ? o : { ...o, lineItems: o.lineItems.map(li => li.id === liId ? { ...li, phase } : li) }
    ));
    const res = await fetch(`/api/pipeline/orders/${orderId}/phase`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineItemId: String(liId), phase }),
    });
    if (!res.ok) {
      setOrders(os => os.map(o =>
        o.id !== orderId ? o : { ...o, lineItems: o.lineItems.map(li => li.id === liId ? { ...li, phase: prev } : li) }
      ));
      showToast('Failed to save phase change');
    }
  }

  // Count of line items per phase (for tab badges)
  const phaseItemCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!group) return map;
    for (const o of orders)
      for (const li of o.lineItems)
        if (group.phases.includes(li.phase))
          map.set(li.phase, (map.get(li.phase) ?? 0) + 1);
    return map;
  }, [orders, group]);

  async function handleBulkApply() {
    if (!bulkPhase || selectedItems.size === 0) return;
    const updates = Array.from(selectedItems).map(key => {
      const [orderId, liId] = key.split('-').map(Number);
      return { orderId, liId };
    });
    for (const { orderId, liId } of updates) await handlePhaseChange(orderId, liId, bulkPhase);
    setSelectedItems(new Set());
    showToast(`Applied "${bulkPhase}" to ${updates.length} items`);
  }

  function toggleItem(key: string) {
    setSelectedItems(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  function toggleGroup(keys: string[]) {
    setSelectedItems(s => {
      const allSel = keys.every(k => s.has(k));
      const n = new Set(s);
      if (allSel) keys.forEach(k => n.delete(k)); else keys.forEach(k => n.add(k));
      return n;
    });
  }

  // Orders that have at least one item in the active phase
  const visibleOrders = useMemo(
    () => orders
      .filter(o => o.lineItems.some(li => li.phase === activePhase))
      .filter(o => !noteFilter || !!o.customerNote),
    [orders, activePhase, noteFilter]
  );

  const filterLineItems = useMemo(
    () => (_o: PipelineOrder, li: PipelineLineItem) => li.phase === activePhase,
    [activePhase]
  );

  const totalItems = useMemo(
    () => visibleOrders.reduce((s, o) => s + o.lineItems.filter(li => li.phase === activePhase).length, 0),
    [visibleOrders, activePhase]
  );

  const totalValue = useMemo(
    () => visibleOrders.reduce(
      (s, o) => s + o.lineItems.filter(li => li.phase === activePhase).reduce((si, li) => si + li.total, 0),
      0
    ),
    [visibleOrders, activePhase]
  );

  if (loading) return <div className="pg-state">Loading…</div>;
  if (error)   return <div className="pg-state" style={{ color: '#e74c3c' }}>{error}</div>;
  if (!group)  return null;

  return (
    <>
      <style>{`
        .pg-state   { text-align:center; color:#aaa; padding:60px 20px; font-size:14px; }
        .pg-sub-nav { display:flex; background:#fff; border-bottom:1px solid #e8ddd4; position:sticky; top:64px; z-index:51; overflow-x:auto; }
        .pg-sub-nav::-webkit-scrollbar { display:none; }
        .pg-sub-btn { font-size:12px; font-weight:700; color:#aaa; background:none; border:none; border-bottom:2px solid transparent; padding:8px 16px; cursor:pointer; white-space:nowrap; flex-shrink:0; }
        .pg-sub-btn.active { color:#7A4610; border-bottom-color:#7A4610; }
        .pg-tab-cnt { margin-left:5px; font-size:10px; border-radius:10px; padding:1px 6px; font-weight:700; }
        .pg-badges  { display:flex; gap:8px; align-items:center; padding:7px 12px; background:#fff; border-bottom:1px solid #e8ddd4; }
        .pg-badge   { font-size:11px; font-weight:600; padding:2px 9px; border-radius:10px; }
        .pg-badge.brown { background:#fef3e2; color:#7A4610; }
        .pg-badge.green { background:#e8f5ee; color:#1a7a3c; }
        .pg-content { padding:8px 8px 80px; }
        .pg-empty   { text-align:center; color:#aaa; padding:40px 20px; font-size:13px; }
        .pg-toast   { position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#333; color:#fff; font-size:12px; font-weight:600; padding:8px 18px; border-radius:20px; z-index:500; pointer-events:none; white-space:nowrap; }
        .pg-toolbar { display:flex; align-items:center; gap:7px; padding:7px 12px; background:#fff; border-bottom:1px solid #e8ddd4; flex-wrap:wrap; }
        .pg-tb-label { font-size:10px; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:.4px; white-space:nowrap; }
        .pg-toggle { position:relative; width:36px; height:20px; flex-shrink:0; }
        .pg-toggle input { opacity:0; width:0; height:0; }
        .pg-toggle-slider { position:absolute; inset:0; background:#ddd; border-radius:20px; cursor:pointer; transition:background .2s; }
        .pg-toggle input:checked + .pg-toggle-slider { background:#7A4610; }
        .pg-toggle-slider:before { content:''; position:absolute; width:14px; height:14px; left:3px; top:3px; background:#fff; border-radius:50%; transition:transform .2s; }
        .pg-toggle input:checked + .pg-toggle-slider:before { transform:translateX(16px); }
        .pg-filter-btn { font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px; border:1.5px solid #e8ddd4; background:#fff; color:#888; cursor:pointer; white-space:nowrap; }
        .pg-filter-btn.active { background:#7A4610; color:#fff; border-color:#7A4610; }
        .pg-bulk-sel { font-size:11px; border:1.5px solid #e8ddd4; border-radius:8px; padding:3px 4px; color:#555; max-width:110px; }
        .pg-bulk-apply { font-size:11px; font-weight:700; background:#7A4610; color:#fff; border:none; border-radius:8px; padding:4px 10px; cursor:pointer; white-space:nowrap; }
        .pg-bulk-apply:disabled { background:#ccc; cursor:default; }
      `}</style>

      {/* Phase tabs */}
      <div className="pg-sub-nav">
        {group.phases.map(phase => {
          const count = phaseItemCounts.get(phase) ?? 0;
          const active = activePhase === phase;
          return (
            <button
              key={phase}
              className={`pg-sub-btn${active ? ' active' : ''}`}
              onClick={() => setActivePhase(phase)}
            >
              {phase}
              {count > 0 && (
                <span
                  className="pg-tab-cnt"
                  style={{ background: active ? '#7A4610' : '#f0e8e0', color: active ? '#fff' : '#7A4610' }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className="pg-badges">
        <span className="pg-badge brown">{totalItems} items · {visibleOrders.length} orders</span>
        {totalValue > 0 && <span className="pg-badge green">{fmtPrice(totalValue)} EGP</span>}
      </div>

      {/* Toolbar */}
      <div className="pg-toolbar">
        <span className="pg-tb-label">Bulk</span>
        <label className="pg-toggle">
          <input type="checkbox" checked={bulkMode} onChange={e => { setBulkMode(e.target.checked); if (!e.target.checked) setSelectedItems(new Set()); }} />
          <span className="pg-toggle-slider" />
        </label>
        {bulkMode && (
          <>
            <select className="pg-bulk-sel" value={bulkPhase} onChange={e => setBulkPhase(e.target.value)}>
              <option value="">— phase —</option>
              {phaseGroups.map(g => (
                <optgroup key={g.id} label={g.label}>
                  {g.phases.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
              ))}
            </select>
            <button className="pg-bulk-apply" disabled={!bulkPhase || selectedItems.size === 0} onClick={handleBulkApply}>
              Apply ({selectedItems.size})
            </button>
          </>
        )}
        <button className={`pg-filter-btn${noteFilter ? ' active' : ''}`} onClick={() => setNoteFilter(f => !f)}>
          📝 Notes
        </button>
      </div>

      {/* Order list */}
      <div className="pg-content">
        {visibleOrders.length === 0 ? (
          <div className="pg-empty">No orders in this phase</div>
        ) : (
          <PipelineOrderList
            orders={visibleOrders}
            groups={phaseGroups}
            filterLineItems={filterLineItems}
            bulkMode={bulkMode}
            selectedItems={selectedItems}
            onToggleItem={toggleItem}
            onToggleGroup={toggleGroup}
            onPhaseChange={handlePhaseChange}
            onOpenDetail={o => setDetailOrder(o)}
          />
        )}
      </div>

      {detailOrder && (
        <OrderDetailSheet order={detailOrder} onClose={() => setDetailOrder(null)} />
      )}

      {toast && <div className="pg-toast">{toast}</div>}
    </>
  );
}
