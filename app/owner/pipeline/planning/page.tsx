'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';

interface PhaseGroup {
  id: string;
  label: string;
  color: string;
  sort_order: number;
  phases: string[];
}

function fmtPrice(n: number) {
  return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
}

function daysBadge(days: number) {
  if (days >= 15) return 'pl-badge urgent';
  if (days >= 8)  return 'pl-badge warn';
  return 'pl-badge';
}

function PhaseSelect({ groups, value, onChange }: {
  groups: PhaseGroup[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <select className="pl-phase-sel" value={value} onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}>
      <option value="">— phase —</option>
      {groups.map(g => (
        <optgroup key={g.id} label={g.label}>
          {g.phases.map(p => <option key={p} value={p}>{p}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export default function PlanningPage() {
  const [orders, setOrders]         = useState<PipelineOrder[]>([]);
  const [phaseGroups, setPhaseGroups] = useState<PhaseGroup[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activePhase, setActivePhase] = useState('');
  const [toast, setToast]           = useState('');
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

  // item count per phase for tab badges
  const phaseCounts = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach(o => o.lineItems.forEach(li => {
      map.set(li.phase, (map.get(li.phase) ?? 0) + 1);
    }));
    return map;
  }, [orders]);

  // active group color
  const activeColor = useMemo(() => {
    for (const g of phaseGroups) {
      if (g.phases.includes(activePhase)) return g.color;
    }
    return '#7A4610';
  }, [phaseGroups, activePhase]);

  // orders that have at least one item in the active phase
  const phaseOrders = useMemo(() =>
    orders.filter(o => o.lineItems.some(li => li.phase === activePhase)),
    [orders, activePhase]
  );

  // flat item list for summary
  const phaseItemsTotal = useMemo(() =>
    phaseOrders.reduce((s, o) =>
      s + o.lineItems.filter(li => li.phase === activePhase).reduce((ss, li) => ss + li.total, 0), 0),
    [phaseOrders, activePhase]
  );
  const phaseItemsCount = phaseCounts.get(activePhase) ?? 0;

  return (
    <>
      <style>{`
        /* ── tabs ── */
        .pl-tabs { display:flex; background:#fff; border-bottom:2px solid #e8ddd4; position:sticky; top:64px; z-index:51; overflow-x:auto; scrollbar-width:none; }
        .pl-tabs::-webkit-scrollbar { display:none; }
        .pl-tab-sep { width:1px; background:#e8ddd4; margin:6px 4px; flex-shrink:0; align-self:stretch; }
        .pl-tab { flex-shrink:0; font-size:11px; font-weight:700; color:#aaa; background:none; border:none; border-bottom:3px solid transparent; padding:8px 12px; cursor:pointer; display:flex; align-items:center; gap:5px; margin-bottom:-2px; transition:color .15s,border-color .15s; white-space:nowrap; }
        .pl-tab:hover { color:#7A4610; }
        .pl-tab.active { color:var(--pl-color, #7A4610); border-bottom-color:var(--pl-color, #7A4610); }
        .pl-tab-count { font-size:10px; font-weight:700; background:#f0e8e0; color:#888; border-radius:10px; padding:1px 6px; min-width:18px; text-align:center; }
        .pl-tab.active .pl-tab-count { color:#fff; }
        .pl-tab-group-label { font-size:9px; font-weight:700; color:#ccc; text-transform:uppercase; letter-spacing:.5px; padding:12px 6px 0; flex-shrink:0; align-self:flex-start; }

        /* ── summary ── */
        .pl-summary { display:flex; gap:8px; align-items:center; padding:7px 12px; background:#fff; border-bottom:1px solid #e8ddd4; }
        .pl-sbadge { font-size:11px; font-weight:600; padding:2px 9px; border-radius:10px; background:#fef3e2; color:#7A4610; }
        .pl-sbadge.green { background:#e8f5ee; color:#1a7a3c; }

        /* ── content ── */
        .pl-content { padding:8px; padding-bottom:80px; }
        .pl-empty { text-align:center; color:#aaa; padding:60px 20px; font-size:14px; }

        /* ── order card ── */
        .pl-card { background:#fff; border:1px solid #e8ddd4; border-radius:10px; margin-bottom:8px; overflow:hidden; }
        .pl-card-head { display:flex; align-items:center; gap:8px; padding:9px 12px; background:#fdf8f4; border-bottom:1px solid #f0e8e0; border-left:4px solid #e8ddd4; }
        .pl-badge { font-size:10px; font-weight:700; color:#fff; background:#7A4610; border-radius:4px; padding:1px 5px; flex-shrink:0; }
        .pl-badge.warn { background:#e67e22; }
        .pl-badge.urgent { background:#e74c3c; }
        .pl-card-num { font-size:11px; font-weight:700; color:#7A4610; flex-shrink:0; }
        .pl-card-name { font-size:13px; font-weight:700; color:#222; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pl-card-date { font-size:10px; color:#aaa; flex-shrink:0; }
        .pl-card-total { font-size:12px; font-weight:700; color:#7A4610; flex-shrink:0; white-space:nowrap; }

        /* ── item row ── */
        .pl-item { display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid #f8f4f0; }
        .pl-item:last-child { border-bottom:none; }
        .pl-thumb { width:34px; height:34px; border-radius:6px; object-fit:cover; flex-shrink:0; border:1px solid #e8ddd4; }
        .pl-thumb-ph { width:34px; height:34px; border-radius:6px; background:#f0e8e0; flex-shrink:0; }
        .pl-item-name { font-size:12px; font-weight:600; color:#333; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pl-item-qty { font-size:11px; color:#888; flex-shrink:0; white-space:nowrap; }
        .pl-item-stock { font-size:10px; color:#1a7a3c; flex-shrink:0; white-space:nowrap; }
        .pl-item-price { font-size:11px; font-weight:700; color:#7A4610; flex-shrink:0; white-space:nowrap; }
        .pl-phase-sel { font-size:11px; border:1px solid #e8ddd4; border-radius:6px; padding:2px 4px; color:#555; flex-shrink:0; max-width:130px; }

        /* ── toast ── */
        .pl-toast { position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#333; color:#fff; font-size:12px; font-weight:600; padding:8px 18px; border-radius:20px; z-index:500; pointer-events:none; white-space:nowrap; }
      `}</style>

      {/* Phase tabs */}
      <div className="pl-tabs">
        {(planningGroup?.phases ?? []).map(p => (
          <button
            key={p}
            className={`pl-tab${activePhase === p ? ' active' : ''}`}
            style={{ '--pl-color': planningGroup!.color } as React.CSSProperties}
            onClick={() => setActivePhase(p)}
          >
            {p}
            <span className="pl-tab-count"
              style={activePhase === p ? { background: planningGroup!.color } : {}}>
              {phaseCounts.get(p) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Summary */}
      {!loading && (
        <div className="pl-summary">
          <span className="pl-sbadge">{phaseItemsCount} items · {phaseOrders.length} orders</span>
          <span className="pl-sbadge green">{fmtPrice(phaseItemsTotal)} EGP</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="pl-empty">Loading…</div>
      ) : phaseOrders.length === 0 ? (
        <div className="pl-empty">No orders in this phase</div>
      ) : (
        <div className="pl-content">
          {phaseOrders.map(o => {
            const items = o.lineItems.filter(li => li.phase === activePhase);
            return (
              <div key={o.id} className="pl-card">
                <div className="pl-card-head" style={{ borderLeftColor: activeColor }}>
                  <span className={daysBadge(o.daysOpen)}>{o.daysOpen}d</span>
                  <span className="pl-card-num">#{o.number}</span>
                  <span className="pl-card-name">{o.customerName}</span>
                  <span className="pl-card-total">{fmtPrice(o.total)} EGP</span>
                </div>
                {items.map(li => (
                  <div key={li.id} className="pl-item">
                    {li.imageUrl
                      ? <img src={li.imageUrl} alt="" className="pl-thumb" />
                      : <div className="pl-thumb-ph" />
                    }
                    <span className="pl-item-name">{li.name}</span>
                    <span className="pl-item-qty">×{li.quantity}</span>
                    <span className="pl-item-stock">📦{li.stock}</span>
                    <span className="pl-item-price">{fmtPrice(li.total)}</span>
                    <PhaseSelect groups={phaseGroups} value={li.phase}
                      onChange={v => handlePhaseChange(o.id, li.id, v)} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {toast && <div className="pl-toast">{toast}</div>}
    </>
  );
}
