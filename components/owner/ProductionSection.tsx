'use client';

import { useEffect, useRef, useState } from 'react';
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
import { usePdfLibs } from '@/components/warranty/Certificate';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title, ChartDataLabels);

// ─── Types ────────────────────────────────────────────────────────
interface Phase {
  Phases: string;
  Group: string;
  Value: number;
  Items: number;
  Rows: WipRow[];
}

/** A row in the group view of the modal remembers which phase it came from. */
type ModalRow = WipRow & { phase?: string };
/** What the orders modal shows: one phase, or a whole group across its phases. */
type ModalData = Omit<Phase, 'Rows'> & { Rows: ModalRow[]; isGroup?: boolean };

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

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** e.g. "Wed, 4 Nov 2026, 14:05" in Cairo time, stamped on the shared picture. */
const todayLabel = () => new Date().toLocaleString('en-GB', {
  timeZone: 'Africa/Cairo', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function daysSince(iso: string | null): string {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? 'today' : `${d}d`;
}

/** Items currently in one phase, longest-waiting first. */
type SortKey = 'waiting' | 'value' | 'newest';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'waiting', label: 'Longest waiting' },
  { key: 'value',   label: 'Value' },
  { key: 'newest',  label: 'Newest' },
];
const byOrderNo = (a: WipRow, b: WipRow) => a.orderNumber.localeCompare(b.orderNumber, undefined, { numeric: true });
const SORTERS: Record<SortKey, (a: WipRow, b: WipRow) => number> = {
  // Earliest phase entry first; items with no phase date go last.
  waiting: (a, b) => (a.since ?? '\uffff').localeCompare(b.since ?? '\uffff') || byOrderNo(a, b),
  value:   (a, b) => b.value - a.value || byOrderNo(a, b),
  newest:  (a, b) => (b.ordered ?? '').localeCompare(a.ordered ?? '') || -byOrderNo(a, b),
};

function PhaseModal({ phase, orders, onClose }: { phase: ModalData; orders: PipelineOrder[]; onClose: () => void }) {
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
  const [sort, setSort] = useState<SortKey>('waiting');
  const rows = [...phase.Rows].sort(SORTERS[sort]);

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
        <div className="prod-sort">
          <span>Sort</span>
          {SORT_OPTIONS.map(o => (
            <button key={o.key} className={sort === o.key ? 'active' : ''} onClick={() => setSort(o.key)}>{o.label}</button>
          ))}
        </div>
        <div style={{ overflowY: 'auto' }}>
          <table className="prod-modal-tbl">
            <thead>
              <tr><th>Order</th><th>Customer / item</th><th className="num">Qty</th><th className="num">Value</th><th className="num">In phase</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
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
                    {phase.isGroup && r.phase && <span className="prod-row-phase">{r.phase}</span>}
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
.prod-seg { border:none; padding:0; cursor:pointer; min-width:0; height:100%; transition:width 0.8s ease-in-out; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:800; }
.prod-modal-overlay { position:fixed; inset:0; z-index:300; background:rgba(28,26,23,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
.prod-modal { background:#fff; border-radius:12px; width:100%; max-width:520px; max-height:85vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,.25); }
.prod-modal-head { display:flex; justify-content:space-between; align-items:center; gap:12px; color:#fff; padding:12px 14px; }
.prod-modal-close { background:none; border:none; color:inherit; font-size:22px; line-height:1; cursor:pointer; padding:0 2px; }
.prod-sort { display:flex; flex-shrink:0; align-items:center; gap:6px; flex-wrap:wrap; padding:8px 10px; background:#fff; border-bottom:1px solid #F0E6D8; font-size:11px; }
.prod-sort > span { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#9e9087; margin-right:2px; }
.prod-sort button { font-size:11px; font-weight:700; color:#7A4610; background:#fff; border:1.5px solid #E8D9C4; border-radius:14px; padding:3px 10px; cursor:pointer; }
.prod-sort button.active { background:#7A4610; border-color:#7A4610; color:#fff; }
.prod-modal-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.prod-modal-tbl th { position:sticky; top:0; background:#FBF5EC; color:#7A6F65; font-size:10px; text-transform:uppercase; letter-spacing:.5px; text-align:left; padding:7px 10px; }
.prod-modal-tbl td { padding:7px 10px; border-bottom:1px solid #F0E6D8; vertical-align:top; }
.prod-ord-btn { font-weight:700; color:#7A4610; background:none; border:none; padding:0; cursor:pointer; text-decoration:underline dotted; text-underline-offset:3px; font-size:12px; }
.prod-modal-tbl .num { text-align:right; white-space:nowrap; }
.prod-share-btn { font-size:12px; font-weight:700; color:#fff; background:#25D366; border:none; border-radius:18px; padding:7px 14px; cursor:pointer; }
.prod-share-btn:disabled { background:#bfe9cf; cursor:default; }
.prod-share-only { display:none; text-align:center; }
.prod-legend { width:100%; border-collapse:separate; border-spacing:0; font-size:12px; background:#fff; border:1px solid #E8D9C4; border-radius:12px; overflow:hidden; }
.prod-legend th { background:#FBF5EC; color:#7A6F65; font-size:10px; text-transform:uppercase; letter-spacing:.5px; text-align:left; padding:7px 10px; font-weight:700; }
.prod-legend td { padding:7px 10px; border-top:1px solid #F0E6D8; color:#1C1A17; }
.prod-legend tfoot td { font-weight:700; background:#FBF5EC; }
.prod-legend .num { text-align:right; white-space:nowrap; }
.prod-legend td:first-child { white-space:nowrap; }
.prod-legend-swatch { display:inline-block; width:12px; height:12px; border-radius:3px; margin-right:8px; vertical-align:-1px; }
.prod-legend-btn { display:inline-flex; align-items:center; background:none; border:none; padding:0; font:inherit; color:#1C1A17; cursor:pointer; text-decoration:underline dotted; text-underline-offset:3px; }
.prod-legend-btn .prod-legend-swatch { vertical-align:0; }
.prod-row-phase { display:inline-block; margin-top:3px; font-size:10px; font-weight:700; color:#7A4610; background:#fef3e2; border-radius:8px; padding:1px 7px; }
`;

// ─── Component ───────────────────────────────────────────────────
export default function ProductionSection() {
  const [data, setData]       = useState<ProdData | null>(null);
  const [loadState, setLoad]  = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErr]      = useState('');
  const [openPhase, setOpenPhase] = useState<ModalData | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const imgLibReady = usePdfLibs(); // loads html2canvas (with jsPDF) from the CDN

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

  // WIP is the order totals spread over items, so it only drifts from Processing by rounding.
  const mismatch = totalWip > 0 && procValue > 0 && Math.abs(totalWip - procValue) > phases.length;

  // ── Group legend: value per phase group, in board order ──────
  const groupTotals: { group: string; value: number; items: number }[] = [];
  for (const p of phases) {
    let g = groupTotals.find(x => x.group === p.Group);
    if (!g) { g = { group: p.Group, value: 0, items: 0 }; groupTotals.push(g); }
    g.value += p.Value || 0;
    g.items += p.Items || 0;
  }
  const legendRows = groupTotals.filter(g => g.value > 0 || g.items > 0);

  /** Every item in a group across its phases, longest-waiting first, each tagged with its phase. */
  const groupModal = (group: string): ModalData => {
    const inGroup = phases.filter(p => p.Group === group);
    return {
      Phases: group, Group: group, isGroup: true,
      Value: inGroup.reduce((s, p) => s + (p.Value || 0), 0),
      Items: inGroup.reduce((s, p) => s + (p.Items || 0), 0),
      Rows: inGroup
        .flatMap(p => p.Rows.map(r => ({ ...r, phase: p.Phases })))
        .sort((a, b) => (a.since ?? '').localeCompare(b.since ?? '') || a.orderNumber.localeCompare(b.orderNumber)),
    };
  };
  const pctOfProc = (v: number) => {
    if (procValue <= 0) return '0%';
    const pct = v / procValue * 100;
    return pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`;
  };

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

  async function shareImage() {
    const el = shareRef.current;
    const h2c = (window as unknown as { html2canvas?: (el: HTMLElement, o?: Record<string, unknown>) => Promise<HTMLCanvasElement> }).html2canvas;
    if (!el || !h2c) return;
    setSharing(true);
    try {
      const canvas = await h2c(el, {
        scale: 2, backgroundColor: '#FBF5EC',
        onclone: (doc: Document) => {
          doc.querySelectorAll<HTMLElement>('.prod-share-only').forEach(n => { n.style.display = 'block'; });
          // html2canvas mis-places text inside <button>s, so the picture gets plain boxes instead.
          doc.querySelectorAll<HTMLElement>('button.prod-seg, button.prod-legend-btn').forEach(b => {
            const box = doc.createElement(b.classList.contains('prod-seg') ? 'div' : 'span');
            box.className = b.className;
            box.setAttribute('style', b.getAttribute('style') ?? '');
            box.innerHTML = b.innerHTML;
            // html2canvas draws this font ~4px low next to coloured boxes; nudge to line them up.
            if (b.classList.contains('prod-seg')) {
              box.innerHTML = `<span style="position:relative;top:-4px">${b.textContent ?? ''}</span>`;
            } else {
              box.style.cssText += ';display:flex;align-items:center;text-decoration:none;';
              box.querySelector<HTMLElement>('.prod-legend-swatch')?.style.setProperty('margin-top', '8px');
            }
            b.replaceWith(box);
          });
        },
      });
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('Could not create the image');
      const file = new File([blob], `production-${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Production WIP', text: `Production WIP · ${todayLabel()}` });
      } else {
        // No share menu (most computers): download the picture instead.
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
    } catch (e) {
      // Closing the share menu without picking an app is not an error.
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        alert('Could not share the image: ' + (e instanceof Error ? e.message : String(e)));
      }
    }
    setSharing(false);
  }

  return (
    <>
      <style>{STYLES}</style>
      <div ref={shareRef} style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Share: renders this section as a picture and opens the phone's share menu (WhatsApp → group). */}
        <div data-html2canvas-ignore style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="prod-share-btn" onClick={() => void shareImage()} disabled={!imgLibReady || sharing}>
            {sharing ? 'Preparing…' : '📤 Share as image'}
          </button>
        </div>
        {/* Only shown in the shared picture */}
        <div className="prod-share-only">
          <div style={{ fontWeight: 800, fontSize: 16, color: '#7A4610' }}>Timbered · Production WIP</div>
          <div style={{ fontSize: 12, color: '#7A6F65' }}>{todayLabel()}</div>
        </div>

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

        {/* Share of WIP per phase group, same colours as the chart; tap a part for its orders */}
        {totalWip > 0 && (
          <div className="prod-multi-bar">
            {legendRows.filter(g => g.value > 0).map(g => {
              const pct = g.value / totalWip * 100;
              return (
                <button
                  key={g.group}
                  className="prod-seg"
                  title={`${g.group}: ${Math.round(pct)}%`}
                  onClick={() => setOpenPhase(groupModal(g.group))}
                  style={{ width: `${pct}%`, background: groupColor(g.group), color: g.group === 'After-sales' ? '#1C1A17' : '#fff' }}
                >
                  {pct >= 4 ? `${Math.round(pct)}%` : ''}
                </button>
              );
            })}
          </div>
        )}

        {/* WIP bar chart */}
        <div style={{ width: '100%', height: 360 }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
        <div data-html2canvas-ignore style={{ fontSize: 11, color: '#9e9087', textAlign: 'center', marginTop: -6 }}>Tap a bar to see its orders</div>

        {/* Legend: each phase group's colour, current value and share of processing value */}
        <table className="prod-legend">
          <thead>
            <tr><th>Group</th><th className="num">Items</th><th className="num">Value</th><th className="num">% of proc.</th></tr>
          </thead>
          <tbody>
            {legendRows.map(g => (
              <tr key={g.group}>
                <td>
                  <button className="prod-legend-btn" onClick={() => setOpenPhase(groupModal(g.group))} title={`Show ${g.group} orders`}>
                    <span className="prod-legend-swatch" style={{ background: groupColor(g.group) }} />
                    {g.group}
                  </button>
                </td>
                <td className="num">{g.items.toLocaleString('en-GB')}</td>
                <td className="num">{fmt(g.value)}</td>
                <td className="num">{pctOfProc(g.value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num">{itemsNo.toLocaleString('en-GB')}</td>
              <td className="num">{fmt(totalWip)}</td>
              <td className="num">{pctOfProc(totalWip)}</td>
            </tr>
          </tfoot>
        </table>

      </div>
      {openPhase && <PhaseModal phase={openPhase} orders={data.orders ?? []} onClose={() => setOpenPhase(null)} />}
    </>
  );
}
