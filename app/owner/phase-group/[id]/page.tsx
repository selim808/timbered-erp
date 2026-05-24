'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';
import PipelineOrderList, { PhaseGroup, Phase, fmtPrice } from '@/components/shared/PipelineOrderCard';
import OrderDetailSheet from '@/components/shared/OrderDetailSheet';
import ProductPopup from '@/components/shared/ProductPopup';

const AFTER_SALES_GROUP = 'After-Sales';
const FOLLOWUP_PHASE    = 'Follow-up';

function followupMessage(): string {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير يا فندم' : 'مساء الخير يا فندم';
  return `${greeting}

حابين نعرف رأى حضرتك فى المنتج و الخدمة
__________________________________________
Hello,

we would like to know your feedback on product and service`;
}

export default function PhaseGroupPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup]             = useState<PhaseGroup | null>(null);
  const [orders, setOrders]           = useState<PipelineOrder[]>([]);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [phaseGroups, setPhaseGroups] = useState<PhaseGroup[]>([]);
  const [phases, setPhases]           = useState<Phase[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [detailOrder, setDetailOrder]   = useState<PipelineOrder | null>(null);
  const [productPopup, setProductPopup] = useState<PipelineLineItem | null>(null);
  const [bulkMode, setBulkMode]       = useState(false);
  const [bulkPhase, setBulkPhase]     = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [noteFilter, setNoteFilter]   = useState(false);
  const [toast, setToast]             = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Completed-orders feed (After-Sales → Follow-up tab)
  const [completedOrders, setCompletedOrders]         = useState<PipelineOrder[]>([]);
  const [completedPage, setCompletedPage]             = useState(1);
  const [completedTotalPages, setCompletedTotalPages] = useState(1);
  const [completedTotal, setCompletedTotal]           = useState(0);
  const [completedLoading, setCompletedLoading]       = useState(false);
  const [completedError, setCompletedError]           = useState('');

  const isFollowupTab =
    group?.name === AFTER_SALES_GROUP && activePhase === FOLLOWUP_PHASE;

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/phase-groups').then(r => r.json()),
      fetch('/api/phases').then(r => r.json()),
      fetch('/api/pipeline/orders').then(r => r.json()),
    ])
      .then(([groups, phs, ords]) => {
        if (!Array.isArray(groups)) { setError('Failed to load phase groups'); return; }
        if (!Array.isArray(phs))    { setError('Failed to load phases'); return; }
        if (!Array.isArray(ords))   { setError(ords?.error ?? 'Failed to load orders'); return; }
        setPhaseGroups(groups);
        setPhases(phs);
        const g = (groups as PhaseGroup[]).find(g => g.id === id);
        if (!g) { setError('Phase group not found'); return; }
        setGroup(g);
        const first = (phs as Phase[]).filter(p => p.phase_group_id === g.id)[0];
        if (first) setActivePhase(first.name);
        setOrders(ords);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Reset to page 1 whenever the user switches into the Follow-up tab
  useEffect(() => {
    if (isFollowupTab) setCompletedPage(1);
  }, [isFollowupTab]);

  // Load completed orders for the current page when on Follow-up tab
  useEffect(() => {
    if (!isFollowupTab) return;
    setCompletedLoading(true);
    setCompletedError('');
    fetch(`/api/wc/completed-orders?page=${completedPage}`)
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setCompletedError(d.error); return; }
        setCompletedOrders(Array.isArray(d.orders) ? d.orders : []);
        setCompletedTotalPages(Number(d.totalPages) || 1);
        setCompletedTotal(Number(d.total) || 0);
      })
      .catch((e: Error) => setCompletedError(e.message))
      .finally(() => setCompletedLoading(false));
  }, [isFollowupTab, completedPage]);

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

  const groupPhases = useMemo(() =>
    group ? phases.filter(p => p.phase_group_id === group.id) : [],
    [group, phases]
  );

  const groupPhaseNames = useMemo(() => new Set(groupPhases.map(p => p.name)), [groupPhases]);

  // Count of line items per phase (for tab badges)
  const phaseItemCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!group) return map;
    for (const o of orders)
      for (const li of o.lineItems)
        if (groupPhaseNames.has(li.phase))
          map.set(li.phase, (map.get(li.phase) ?? 0) + 1);
    return map;
  }, [orders, group, groupPhaseNames]);

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
  const visibleOrders = useMemo(() => {
    if (isFollowupTab) {
      return completedOrders.filter(o => !noteFilter || !!o.customerNote);
    }
    return orders
      .filter(o => o.lineItems.some(li => li.phase === activePhase))
      .filter(o => !noteFilter || !!o.customerNote);
  }, [isFollowupTab, completedOrders, orders, activePhase, noteFilter]);

  const filterLineItems = useMemo(
    () => isFollowupTab
      ? undefined
      : (_o: PipelineOrder, li: PipelineLineItem) => li.phase === activePhase,
    [isFollowupTab, activePhase]
  );

  const totalItems = useMemo(() => {
    if (isFollowupTab) return visibleOrders.reduce((s, o) => s + o.lineItems.length, 0);
    return visibleOrders.reduce((s, o) => s + o.lineItems.filter(li => li.phase === activePhase).length, 0);
  }, [isFollowupTab, visibleOrders, activePhase]);

  const totalValue = useMemo(() => {
    if (isFollowupTab) return visibleOrders.reduce((s, o) => s + o.total, 0);
    return visibleOrders.reduce(
      (s, o) => s + o.lineItems.filter(li => li.phase === activePhase).reduce((si, li) => si + li.total, 0),
      0
    );
  }, [isFollowupTab, visibleOrders, activePhase]);

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
        .pg-pager  { display:flex; align-items:center; justify-content:center; gap:10px; padding:14px 8px 4px; }
        .pg-pager-btn { font-size:11px; font-weight:700; padding:6px 14px; border-radius:20px; border:1.5px solid #7A4610; background:#fff; color:#7A4610; cursor:pointer; white-space:nowrap; }
        .pg-pager-btn:hover:not(:disabled) { background:#7A4610; color:#fff; }
        .pg-pager-btn:disabled { border-color:#e8ddd4; color:#ccc; cursor:default; }
        .pg-pager-info { font-size:11px; font-weight:600; color:#888; white-space:nowrap; }
      `}</style>

      {/* Phase tabs */}
      <div className="pg-sub-nav">
        {groupPhases.map(p => {
          const isFollowupBtn = group.name === AFTER_SALES_GROUP && p.name === FOLLOWUP_PHASE;
          const count = isFollowupBtn ? completedTotal : (phaseItemCounts.get(p.name) ?? 0);
          const active = activePhase === p.name;
          return (
            <button
              key={p.id}
              className={`pg-sub-btn${active ? ' active' : ''}`}
              onClick={() => setActivePhase(p.name)}
            >
              {p.name}
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
                <optgroup key={g.id} label={g.name}>
                  {phases.filter(p => p.phase_group_id === g.id).map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
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
        {isFollowupTab && completedError ? (
          <div className="pg-empty" style={{ color: '#e74c3c' }}>{completedError}</div>
        ) : isFollowupTab && completedLoading ? (
          <div className="pg-empty">Loading completed orders…</div>
        ) : visibleOrders.length === 0 ? (
          <div className="pg-empty">
            {isFollowupTab ? 'No completed orders' : 'No orders in this phase'}
          </div>
        ) : (
          <>
            <PipelineOrderList
              orders={visibleOrders}
              groups={phaseGroups}
              phases={phases}
              filterLineItems={filterLineItems}
              bulkMode={bulkMode}
              selectedItems={selectedItems}
              onToggleItem={toggleItem}
              onToggleGroup={toggleGroup}
              onPhaseChange={handlePhaseChange}
              onOpenDetail={o => setDetailOrder(o)}
              onImageClick={li => setProductPopup(li)}
              waMessage={isFollowupTab ? followupMessage() : undefined}
            />
            {isFollowupTab && completedTotalPages > 1 && (
              <div className="pg-pager">
                <button
                  className="pg-pager-btn"
                  disabled={completedPage <= 1 || completedLoading}
                  onClick={() => setCompletedPage(p => Math.max(1, p - 1))}
                >
                  ← Newer
                </button>
                <span className="pg-pager-info">
                  Page {completedPage} of {completedTotalPages} · {completedTotal} orders
                </span>
                <button
                  className="pg-pager-btn"
                  disabled={completedPage >= completedTotalPages || completedLoading}
                  onClick={() => setCompletedPage(p => Math.min(completedTotalPages, p + 1))}
                >
                  Older →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {detailOrder && (
        <OrderDetailSheet order={detailOrder} onClose={() => setDetailOrder(null)} />
      )}
      {productPopup && (
        <ProductPopup li={productPopup} orders={orders} onClose={() => setProductPopup(null)} />
      )}

      {toast && <div className="pg-toast">{toast}</div>}
    </>
  );
}
