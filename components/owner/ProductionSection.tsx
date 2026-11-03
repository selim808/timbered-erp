'use client';

import { useEffect, useState } from 'react';
import LoadingDots from './LoadingDots';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale,
  LinearScale, Tooltip, Title,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { WipRow } from '@/app/api/production/route';
import type { PipelineOrder } from '@/app/api/pipeline/orders/route';
import OrderDetailSheet from '@/components/shared/OrderDetailSheet';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title, ChartDataLabels);

// ─── Types ────────────────────────────────────────────────────────
interface Phase {
  Phases: string;
  Group: string;
  Value: number;
  Items: number;
  Rows: WipRow[];
}

interface ProdData {
  phases: Phase[];
  orders: PipelineOrder[];
  ordersNo: number;
  itemsNo: number;
  procValue: number;
  unphasedItems: number;
}

// ─── Phase colour rules ───────────────────────────────────────────
// One colour per Supabase phase group.
const NO_PHASE = 'No phase';
const GROUP_COLORS: Record<string, string> = {
  'Confirmation': '#7f8c9d',
  'Planning':     '#8e44ad',
  'Production':   '#2980b9',
  'Warehouse':    '#f1948a',
  'Delivery':     '#27ae60',
  'After-sales':  '#f4d03f',
  [NO_PHASE]:     '#bdc3c7',
};
const groupColor = (g: string) => GROUP_COLORS[g] ?? '#bdc3c7';

// Groups counted as Fabrication; the rest (Warehouse, Delivery, After-sales) count as Delivery.
const FAB_GROUPS = new Set(['Confirmation', 'Planning', 'Production', NO_PHASE]);

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

function daysSince(iso: string | null): string {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? 'today' : `${d}d`;
}

/** Items currently in one phase, longest-waiting first. */
function PhaseModal({ phase, orders, onClose }: { phase: Phase; orders: PipelineOrder[]; onClose: () => void }) {
  const [detail, setDetail] = useState<PipelineOrder | null>(null);

  useEffect(() => {
    // Escape closes the order details first, then the list.
    if (detail) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, detail]);

  const byNumber = new Map(orders.map(o => [String(o.number || o.id), o]));

  const orderCount = new Set(phase.Rows.map(r => r.orderNumber)).size;

  return (
    <div className="prod-modal-overlay" onClick={onClose}>
      <div className="prod-modal" onClick={e => e.stopPropagation()}>
        <div className="prod-modal-head" style={{ background: groupColor(phase.Group), color: phase.Group === 'After-sales' ? '#1C1A17' : '#fff' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{phase.Phases}</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {orderCount} order{orderCount === 1 ? '' : 's'} · {phase.Items} item{phase.Items === 1 ? '' : 's'} · {fmt(phase.Value)} EGP
            </div>
          </div>
          <button className="prod-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div style={{ overflowY: 'auto' }}>
          <table className="prod-modal-tbl">
            <thead>
              <tr><th>Order</th><th>Customer / item</th><th className="num">Qty</th><th className="num">Value</th><th className="num">In phase</th></tr>
            </thead>
            <tbody>
              {phase.Rows.map((r, i) => (
                <tr key={`${r.orderNumber}-${i}`}>
                  <td>
                    {byNumber.has(r.orderNumber) ? (
                      <button className="prod-ord-btn" onClick={() => setDetail(byNumber.get(r.orderNumber)!)}>
                        {r.orderNumber}
                      </button>
                    ) : (
                      <span style={{ fontWeight: 700, color: '#7A4610' }}>{r.orderNumber}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.customer || '—'}</div>
                    <div style={{ fontSize: 11, color: '#7A6F65' }}>{r.item}</div>
                  </td>
                  <td className="num">{r.qty}</td>
                  <td className="num">{fmt(r.value)}</td>
                  <td className="num">{daysSince(r.since)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {detail && (
        <div onClick={e => e.stopPropagation()}>
          <OrderDetailSheet order={detail} onClose={() => setDetail(null)} onBack={() => setDetail(null)} />
        </div>
      )}
    </div>
  );
}

// ─── CSS ─────────────────────────────────────────────────────────
const STYLES = `
.prod-kpi-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%; margin-bottom:4px; }
.prod-kpi-card { background:#fff; border:1px solid #E8D9C4; border-radius:12px; padding:14px 16px; text-align:center; }
.prod-label { display:block; font-size:10px; color:#9e9087; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:4px; }
.prod-kpi { font-size:22px; font-weight:700; color:#1C1A17; margin-top:4px; }
.prod-multi-bar { display:flex; width:100%; height:22px; background:#f0f0f0; border-radius:11px; overflow:hidden; }
.prod-seg { height:100%; transition:width 0.8s ease-in-out; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:800; }
.prod-dist-wrap { position:relative; height:20px; margin-top:8px; overflow:visible; margin-bottom:4px; }
.prod-modal-overlay { position:fixed; inset:0; z-index:300; background:rgba(28,26,23,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
.prod-modal { background:#fff; border-radius:12px; width:100%; max-width:520px; max-height:85vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,.25); }
.prod-modal-head { display:flex; justify-content:space-between; align-items:center; gap:12px; color:#fff; padding:12px 14px; }
.prod-modal-close { background:none; border:none; color:inherit; font-size:22px; line-height:1; cursor:pointer; padding:0 2px; }
.prod-modal-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.prod-modal-tbl th { position:sticky; top:0; background:#FBF5EC; color:#7A6F65; font-size:10px; text-transform:uppercase; letter-spacing:.5px; text-align:left; padding:7px 10px; }
.prod-modal-tbl td { padding:7px 10px; border-bottom:1px solid #F0E6D8; vertical-align:top; }
.prod-ord-btn { font-weight:700; color:#7A4610; background:none; border:none; padding:0; cursor:pointer; text-decoration:underline dotted; text-underline-offset:3px; font-size:12px; }
.prod-modal-tbl .num { text-align:right; white-space:nowrap; }
.prod-dist-lbl { position:absolute; font-size:10px; color:#999; font-weight:700; text-transform:uppercase; white-space:nowrap; transform:translateX(-50%); transition:left 0.8s ease-in-out; }
`;

// ─── Component ───────────────────────────────────────────────────
export default function ProductionSection() {
  const [data, setData]       = useState<ProdData | null>(null);
  const [loadState, setLoad]  = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErr]      = useState('');
  const [openPhase, setOpenPhase] = useState<Phase | null>(null);

  useEffect(() => {
    fetch('/api/production')
      .then(r => r.json())
      .then((d: ProdData | { error: string }) => {
        if ('error' in d) throw new Error((d as { error: string }).error);
        setData(d as ProdData);
        setLoad('done');
      })
      .catch((e: Error) => { setErr(e.message); setLoad('error'); });
  }, []);

  if (loadState === 'loading') return <LoadingDots label="Loading production" />;
  if (loadState === 'error') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>Could not load production — {errMsg}</div>
  );
  if (!data) return null;

  const { phases, ordersNo, itemsNo, procValue, unphasedItems } = data;

  // ── WIP totals ────────────────────────────────────────────────
  const totalWip = phases.reduce((s, p) => s + (p.Value || 0), 0);
  const fabPhases = phases.filter(p => FAB_GROUPS.has(p.Group));
  const dlvPhases = phases.filter(p => !FAB_GROUPS.has(p.Group));
  const fabVal    = fabPhases.reduce((s, p) => s + (p.Value || 0), 0);
  const dlvVal    = dlvPhases.reduce((s, p) => s + (p.Value || 0), 0);
  const fabPct    = totalWip > 0 ? Math.round(fabVal / totalWip * 100) : 0;
  const dlvPct    = totalWip > 0 ? Math.round(dlvVal / totalWip * 100) : 0;

  // WIP is the order totals spread over items, so it only drifts from Processing by rounding.
  const mismatch = totalWip > 0 && procValue > 0 && Math.abs(totalWip - procValue) > phases.length;

  // ── Bar chart ────────────────────────────────────────────────
  const filtered = phases.filter(p => (p.Value || 0) > 0);
  const colors   = filtered.map(p => groupColor(p.Group));
  const chartData = {
    labels: filtered.map(p => p.Phases),
    datasets: [{ data: filtered.map(p => p.Value), backgroundColor: colors, borderWidth: 0 }],
  };
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    // Tap a bar to list the items in that phase.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onClick: (_: unknown, els: any[]) => { if (els.length) setOpenPhase(filtered[els[0].index] ?? null); },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onHover: (e: any, els: any[]) => { if (e.native?.target) e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
    plugins: {
      legend: { display: false },
      title:  { display: true, text: 'WIP Breakdown', font: { size: 14, weight: 'bold' as const } },
      datalabels: {
        anchor: 'end' as const, align: 'top' as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        color: (ctx: any) => (filtered[ctx.dataIndex]?.Group === 'After-sales' ? '#b7950b' : colors[ctx.dataIndex]) as string,
        font:  { weight: 'bold' as const, size: 10 },
        formatter: (v: number) => v > 0 ? Math.round(v / 1000) + 'K' : '',
      },
    },
    scales: {
      x: { ticks: { maxRotation: 90, font: { size: 9 } }, grid: { display: false } },
      y: { ticks: { callback: (v: number | string) => Math.round(Number(v) / 1000) + 'K' }, grid: { color: '#f0f0f0' } },
    },
  };

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* KPI cards */}
        <div className="prod-kpi-grid">
          {[
            { label: 'Processing Orders', val: ordersNo.toLocaleString('en-GB') },
            { label: 'Total Items',        val: itemsNo.toLocaleString('en-GB')  },
            { label: 'Total WIP Value',    val: fmt(totalWip) },
            { label: 'Processing Value',   val: fmt(procValue) },
          ].map(({ label, val }) => (
            <div key={label} className="prod-kpi-card">
              <span className="prod-label">{label}</span>
              <div className="prod-kpi">{val}</div>
            </div>
          ))}
        </div>

        {/* Mismatch warning */}
        {unphasedItems > 0 && (
          <div style={{ color: '#e74c3c', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
            {unphasedItems.toLocaleString('en-GB')} item{unphasedItems === 1 ? '' : 's'} with no kanban phase → check
          </div>
        )}
        {mismatch && (
          <div style={{ color: '#e74c3c', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
            Kanban ≠ Processing → check
          </div>
        )}

        {/* Fab vs Delivery distribution bar */}
        <div style={{ paddingBottom: 8 }}>
          <div className="prod-multi-bar">
            <div className="prod-seg" style={{ width: `${fabPct}%`, background: '#2980b9' }}>
              {fabPct > 8 ? `${fabPct}% (${Math.round(fabVal / 1000)}K)` : ''}
            </div>
            <div className="prod-seg" style={{ width: `${dlvPct}%`, background: '#27ae60' }}>
              {dlvPct > 8 ? `${dlvPct}% (${Math.round(dlvVal / 1000)}K)` : ''}
            </div>
          </div>
          <div className="prod-dist-wrap">
            <span className="prod-dist-lbl" style={{ left: `${fabPct / 2}%`, opacity: fabPct > 8 ? 1 : 0 }}>Fabrication</span>
            <span className="prod-dist-lbl" style={{ left: `${fabPct + dlvPct / 2}%`, opacity: dlvPct > 8 ? 1 : 0 }}>Delivery</span>
          </div>
        </div>

        {/* WIP bar chart */}
        <div style={{ width: '100%', height: 360 }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
        <div style={{ fontSize: 11, color: '#9e9087', textAlign: 'center', marginTop: -6 }}>Tap a bar to see its orders</div>

      </div>
      {openPhase && <PhaseModal phase={openPhase} orders={data.orders ?? []} onClose={() => setOpenPhase(null)} />}
    </>
  );
}
