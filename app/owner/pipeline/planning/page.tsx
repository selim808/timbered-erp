'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PipelineOrder } from '@/app/api/pipeline/orders/route';
import PipelineOrderList, { PhaseGroup, fmtPrice } from '@/components/shared/PipelineOrderCard';
import OrderDetailSheet from '@/components/shared/OrderDetailSheet';
import type { OrderSheetRow } from '@/components/shared/OrderDetailSheet';

export default function PlanningPage() {
  const router = useRouter();
  const [orders, setOrders]           = useState<PipelineOrder[]>([]);
  const [phaseGroups, setPhaseGroups] = useState<PhaseGroup[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activePhase, setActivePhase] = useState('');
  const [toast, setToast]             = useState('');
  const [bulkMode, setBulkMode]       = useState(false);
  const [bulkPhase, setBulkPhase]     = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/pipeline/orders').then(r => r.json()),
      fetch('/api/phase-groups').then(r => r.json()),
    ]).then(([ords, grps]) => {
      if (Array.isArray(ords)) setOrders(ords);
      if (Array.isArray(grps)) {
        setPhaseGroups(grps);
        const pg = grps.find((g: PhaseGroup) => g.id === 'planning' || g.label.toLowerCase() === 'planning');
        if (pg?.phases[0]) setActivePhase(pg.phases[0]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  function toggleItem(key: string) {
    setSelectedItems(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function toggleGroup(keys: string[]) {
    setSelectedItems(s => {
      const allSel = keys.every(k => s.has(k));
      const n = new Set(s);
      if (allSel) keys.forEach(k => n.delete(k));
      else keys.forEach(k => n.add(k));
      return n;
    });
  }

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

  const planningGroup = useMemo(() =>
    phaseGroups.find(g => g.id === 'planning' || g.label.toLowerCase() === 'planning'),
    [phaseGroups]
  );

  const phaseCounts = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach(o => o.lineItems.forEach(li => {
      map.set(li.phase, (map.get(li.phase) ?? 0) + 1);
    }));
    return map;
  }, [orders]);

  const activeColor = useMemo(() => {
    for (const g of phaseGroups) {
      if (g.phases.includes(activePhase)) return g.color;
    }
    return '#7A4610';
  }, [phaseGroups, activePhase]);

  const phaseOrders = useMemo(() =>
    orders.filter(o => o.lineItems.some(li => li.phase === activePhase)),
    [orders, activePhase]
  );

  const phaseItemsTotal = useMemo(() =>
    phaseOrders.reduce((s, o) =>
      s + o.lineItems.filter(li => li.phase === activePhase).reduce((ss, li) => ss + li.total, 0), 0),
    [phaseOrders, activePhase]
  );
  const phaseItemsCount = phaseCounts.get(activePhase) ?? 0;

  const detailOrder = detailOrderId != null ? (orders.find(o => o.id === detailOrderId) ?? null) : null;
  const detailRows = useMemo<OrderSheetRow[]>(() =>
    detailOrder ? detailOrder.lineItems.map(item => ({ o: detailOrder, item })) : [],
    [detailOrder]
  );

  return (
    <>
      <style>{`
        .pl-tabs { display:flex; background:#fff; border-bottom:2px solid #e8ddd4; position:sticky; top:64px; z-index:51; overflow-x:auto; scrollbar-width:none; }
        .pl-tabs::-webkit-scrollbar { display:none; }
        .pl-tab-sep { width:1px; background:#e8ddd4; margin:6px 4px; flex-shrink:0; align-self:stretch; }
        .pl-tab { flex-shrink:0; font-size:11px; font-weight:700; color:#aaa; background:none; border:none; border-bottom:3px solid transparent; padding:8px 12px; cursor:pointer; display:flex; align-items:center; gap:5px; margin-bottom:-2px; transition:color .15s,border-color .15s; white-space:nowrap; }
        .pl-tab:hover { color:#7A4610; }
        .pl-tab.active { color:var(--pl-color, #7A4610); border-bottom-color:var(--pl-color, #7A4610); }
        .pl-tab-count { font-size:10px; font-weight:700; background:#f0e8e0; color:#888; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }
        .pl-tab.active .pl-tab-count { color:#fff; }
        .pl-tab-group-label { font-size:9px; font-weight:700; color:#ccc; text-transform:uppercase; letter-spacing:.5px; padding:12px 6px 0; flex-shrink:0; align-self:flex-start; }
        .pl-summary { display:flex; gap:8px; align-items:center; padding:7px 12px; background:#fff; border-bottom:1px solid #e8ddd4; }
        .pl-sbadge { font-size:11px; font-weight:600; padding:2px 9px; border-radius:10px; background:#fef3e2; color:#7A4610; }
        .pl-sbadge.green { background:#e8f5ee; color:#1a7a3c; }
        .pl-content { padding:8px; padding-bottom:80px; }
        .pl-empty { text-align:center; color:#aaa; padding:60px 20px; font-size:14px; }
        .pl-bulk-bar { display:flex; align-items:center; gap:7px; padding:7px 12px; background:#fff; border-bottom:1px solid #e8ddd4; flex-wrap:wrap; }
        .pl-bulk-label { font-size:10px; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:.4px; }
        .pl-toggle { position:relative; width:36px; height:20px; flex-shrink:0; }
        .pl-toggle input { opacity:0; width:0; height:0; }
        .pl-toggle-slider { position:absolute; inset:0; background:#ddd; border-radius:20px; cursor:pointer; transition:background .2s; }
        .pl-toggle input:checked + .pl-toggle-slider { background:#7A4610; }
        .pl-toggle-slider:before { content:''; position:absolute; width:14px; height:14px; left:3px; top:3px; background:#fff; border-radius:50%; transition:transform .2s; }
        .pl-toggle input:checked + .pl-toggle-slider:before { transform:translateX(16px); }
        .pl-bulk-sel { font-size:11px; border:1.5px solid #e8ddd4; border-radius:8px; padding:3px 4px; color:#555; max-width:130px; }
        .pl-bulk-apply { font-size:11px; font-weight:700; background:#7A4610; color:#fff; border:none; border-radius:8px; padding:4px 10px; cursor:pointer; white-space:nowrap; }
        .pl-bulk-apply:disabled { background:#ccc; cursor:default; }
        .pl-create-jo { font-size:11px; font-weight:700; padding:4px 14px; border-radius:8px; border:1.5px solid #1a7a3c; background:#1a7a3c; color:#fff; cursor:pointer; white-space:nowrap; margin-left:auto; }
        .pl-toast { position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#333; color:#fff; font-size:12px; font-weight:600; padding:8px 18px; border-radius:20px; z-index:500; pointer-events:none; white-space:nowrap; }
      `}</style>

      <div className="pl-tabs">
        {(planningGroup?.phases ?? []).map(p => (
          <button key={p}
            className={`pl-tab${activePhase === p ? ' active' : ''}`}
            style={{ '--pl-color': planningGroup!.color } as React.CSSProperties}
            onClick={() => setActivePhase(p)}>
            {p}
            <span className="pl-tab-count" style={activePhase === p ? { background: planningGroup!.color } : {}}>
              {phaseCounts.get(p) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {!loading && (
        <div className="pl-summary">
          <span className="pl-sbadge">{phaseItemsCount} items · {phaseOrders.length} orders</span>
          <span className="pl-sbadge green">{fmtPrice(phaseItemsTotal)} EGP</span>
        </div>
      )}

      <div className="pl-bulk-bar">
        <span className="pl-bulk-label">Bulk</span>
        <label className="pl-toggle">
          <input type="checkbox" checked={bulkMode} onChange={e => { setBulkMode(e.target.checked); if (!e.target.checked) setSelectedItems(new Set()); }} />
          <span className="pl-toggle-slider" />
        </label>
        {bulkMode && (
          <>
            <select className="pl-bulk-sel" value={bulkPhase} onChange={e => setBulkPhase(e.target.value)}>
              <option value="">— phase —</option>
              {phaseGroups.map(g => (
                <optgroup key={g.id} label={g.label}>
                  {g.phases.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
              ))}
            </select>
            <button className="pl-bulk-apply" disabled={!bulkPhase || selectedItems.size === 0} onClick={handleBulkApply}>
              Apply ({selectedItems.size})
            </button>
          </>
        )}
        {/jo/i.test(activePhase) && (
          <button className="pl-create-jo" onClick={() => router.push('/owner/pipeline/job-orders')}>+ Create JO</button>
        )}
      </div>

      {loading ? (
        <div className="pl-empty">Loading…</div>
      ) : phaseOrders.length === 0 ? (
        <div className="pl-empty">No orders in this phase</div>
      ) : (
        <div className="pl-content">
          <PipelineOrderList
            orders={phaseOrders}
            groups={phaseGroups}
            filterLineItems={(_, li) => li.phase === activePhase}
            defaultOpen
            accentColor={activeColor}
            bulkMode={bulkMode}
            selectedItems={selectedItems}
            onToggleItem={toggleItem}
            onToggleGroup={toggleGroup}
            onPhaseChange={handlePhaseChange}
            onOpenDetail={o => setDetailOrderId(o.id)}
          />
        </div>
      )}

      {detailOrder && (
        <OrderDetailSheet
          title={`#${detailOrder.number} · ${detailOrder.customerName}`}
          rows={detailRows}
          onClose={() => setDetailOrderId(null)}
        />
      )}

      {toast && <div className="pl-toast">{toast}</div>}
    </>
  );
}
