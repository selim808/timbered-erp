'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { WeekEntry } from '@/app/api/weekly/route';
import type { OrderRow } from '@/app/api/weekly/orders/route';
import type { OrderDetail } from '@/app/api/weekly/order/[id]/route';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title, ChartDataLabels);

// ─── Helpers ─────────────────────────────────────────────────────
const fmt = (n: number) => n > 0 ? Math.round(n).toLocaleString('en-GB') : '—';
const fmtK = (n: number) => n > 0 ? Math.round(n / 1000) + 'K' : '—';

function toLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDay(dateStr: string, opts: Intl.DateTimeFormatOptions) {
  return toLocalDate(dateStr).toLocaleDateString('en-GB', opts);
}

// ─── CSS ─────────────────────────────────────────────────────────
const STYLES = `
.wk-card { background:#fff; border:1px solid #E8D9C4; border-radius:12px; padding:10px 12px; }
.wk-label { display:block; font-size:10px; color:#9e9087; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:3px; }
.wk-kpi { font-size:18px; font-weight:700; margin-top:2px; }
.wk-select { width:100%; padding:10px 32px 10px 12px; border-radius:8px; border:1.5px solid #C8AA88; font-size:14px; background:#fff; cursor:pointer; outline:none; font-family:'DM Sans',sans-serif; -webkit-appearance:none; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; }
.wk-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.wk-tbl th { text-align:center; font-size:11px; font-weight:600; padding:4px 6px; color:#888; border-bottom:1px solid #E8D9C4; }
.wk-tbl td { text-align:center; padding:4px 6px; }
.wk-yr-btn { padding:5px 10px; border-radius:6px; border:1.5px solid #C8AA88; background:#fff; color:#7A4610; font-size:12px; font-weight:600; cursor:pointer; }
.wk-yr-btn.active { background:#B86E1A; color:#fff; border-color:#B86E1A; }
.wk-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; }
.wk-modal { background:#fff; border-radius:16px; width:100%; max-width:580px; max-height:82vh; display:flex; flex-direction:column; box-shadow:0 8px 32px rgba(0,0,0,0.18); }
.wk-modal-hdr { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #E8D9C4; flex-shrink:0; }
.wk-modal-title { font-size:14px; font-weight:700; color:#2c3e50; }
.wk-modal-sub { font-size:11px; color:#9e9087; margin-top:2px; }
.wk-modal-close { border:none; background:none; font-size:22px; line-height:1; cursor:pointer; color:#aaa; padding:0 2px; }
.wk-modal-close:hover { color:#555; }
.wk-modal-body { overflow-y:auto; padding:10px 14px 14px; }
.wk-ord-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.wk-ord-tbl th { font-size:10px; font-weight:700; color:#9e9087; text-transform:uppercase; letter-spacing:0.6px; padding:6px 8px; border-bottom:1px solid #E8D9C4; text-align:left; white-space:nowrap; }
.wk-ord-tbl th.right { text-align:right; }
.wk-ord-tbl td { padding:7px 8px; border-bottom:1px solid #f5f0ea; }
.wk-ord-tbl tr:last-child td { border-bottom:none; }
.wk-ord-tbl tr:hover td { background:#faf7f3; }
.wk-ord-tbl .right { text-align:right; }
.wk-ord-num { font-weight:700; color:#7A4610; }
.wk-cell-btn { background:none; border:none; padding:0; cursor:pointer; width:100%; text-align:center; }
.wk-cell-btn:hover { text-decoration:underline; }
.wk-ord-num-btn { background:none; border:none; padding:0; cursor:pointer; font-weight:700; color:#7A4610; font-size:12px; font-family:inherit; }
.wk-ord-num-btn:hover { text-decoration:underline; color:#B86E1A; }
.wk-detail-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:1010; display:flex; align-items:center; justify-content:center; padding:16px; }
.wk-detail-modal { background:#fff; border-radius:16px; width:100%; max-width:520px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 12px 40px rgba(0,0,0,0.22); }
.wk-detail-hdr { display:flex; align-items:flex-start; justify-content:space-between; padding:14px 16px 12px; border-bottom:1px solid #E8D9C4; flex-shrink:0; }
.wk-detail-body { overflow-y:auto; padding:12px 16px 16px; display:flex; flex-direction:column; gap:12px; }
.wk-status { display:inline-block; padding:2px 9px; border-radius:10px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-left:8px; vertical-align:middle; }
.wk-section-lbl { font-size:10px; color:#9e9087; text-transform:uppercase; font-weight:700; letter-spacing:0.6px; margin-bottom:5px; }
.wk-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 12px; font-size:12px; color:#444; }
.wk-info-grid span { color:#888; font-size:11px; display:block; }
.wk-items-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.wk-items-tbl th { font-size:10px; font-weight:700; color:#9e9087; text-transform:uppercase; padding:4px 0; border-bottom:1px solid #E8D9C4; text-align:left; }
.wk-items-tbl th.r { text-align:right; }
.wk-items-tbl td { padding:6px 0; border-bottom:1px solid #f5f0ea; vertical-align:top; }
.wk-items-tbl tr:last-child td { border-bottom:none; }
.wk-items-tbl .r { text-align:right; }
.wk-totals { border-top:1px solid #E8D9C4; padding-top:8px; display:flex; flex-direction:column; gap:3px; font-size:12px; }
.wk-totals-row { display:flex; justify-content:space-between; color:#666; }
.wk-totals-grand { display:flex; justify-content:space-between; font-size:14px; font-weight:700; color:#2c3e50; border-top:1px solid #E8D9C4; padding-top:6px; margin-top:4px; }
.wk-detail-back { background:none; border:none; font-size:13px; color:#7A4610; cursor:pointer; padding:0; font-family:inherit; display:flex; align-items:center; gap:4px; }
.wk-detail-back:hover { text-decoration:underline; }
`;

// ─── Component ───────────────────────────────────────────────────
export default function WeeklySection() {
  const [weeks, setWeeks]       = useState<WeekEntry[]>([]);
  const [selKey, setSelKey]     = useState('');
  const [selYears, setSelYears] = useState<Set<number>>(new Set());
  const [chartStart, setChartStart] = useState('');
  const [chartEnd, setChartEnd]     = useState('');
  const [loadState, setLoad]    = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErr]        = useState('');
  const [modal, setModal]       = useState<{ date: string; metric: string; label: string } | null>(null);
  const [modalOrders, setModalOrders] = useState<OrderRow[]>([]);
  const [modalLoad, setModalLoad]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [modalErr, setModalErr]       = useState('');
  const [selOrder, setSelOrder]       = useState<OrderDetail | null>(null);
  const [selOrderLoad, setSelOrderLoad] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [selOrderErr, setSelOrderErr] = useState('');
  const today = todayStr();

  useEffect(() => {
    fetch('/api/weekly')
      .then(r => r.json())
      .then((data: WeekEntry[] | { error: string }) => {
        if (!Array.isArray(data)) throw new Error((data as { error: string }).error);
        setWeeks(data);
        // Default: select current week (first entry, most recent)
        const curKey = data[0]?.key ?? '';
        setSelKey(curKey);
        // Default: current year selected
        const curYear = new Date().getFullYear();
        setSelYears(new Set([curYear]));
        setLoad('done');
      })
      .catch((e: Error) => { setErr(e.message); setLoad('error'); });
  }, []);

  // ── Derived chart labels ──────────────────────────────────────
  const allChartLabels = useMemo(() =>
    [...weeks].reverse()
      .filter(w => w.completed > 0 || w.cancelled > 0 || w.created > 0)
      .map(w => w.chartLabel),
    [weeks]
  );

  const allYears = useMemo(() => {
    const ys = new Set(weeks.map(w => w.year));
    return [...ys].sort((a, b) => b - a);
  }, [weeks]);

  const filteredLabels = useMemo(() =>
    allChartLabels.filter(l => {
      const yr = parseInt('20' + l.slice(0, 2));
      return selYears.has(yr);
    }),
    [allChartLabels, selYears]
  );

  // Update chart start/end when years change
  useEffect(() => {
    if (!filteredLabels.length) return;
    setChartStart(prev => filteredLabels.includes(prev) ? prev : filteredLabels[0]);
    setChartEnd(prev => filteredLabels.includes(prev) ? prev : filteredLabels[filteredLabels.length - 1]);
  }, [filteredLabels]);

  const chartWeekMap = useMemo(() => {
    const m: Record<string, WeekEntry> = {};
    weeks.forEach(w => { m[w.chartLabel] = w; });
    return m;
  }, [weeks]);

  const visibleLabels = useMemo(() => {
    if (!chartStart || !chartEnd) return filteredLabels;
    return filteredLabels.filter(l => l >= chartStart && l <= chartEnd);
  }, [filteredLabels, chartStart, chartEnd]);

  // ── Selected week data ────────────────────────────────────────
  const selWeek = useMemo(() => weeks.find(w => w.key === selKey) ?? null, [weeks, selKey]);

  // ── yMax must be before early returns (Rules of Hooks) ────────
  const yMax = useMemo(() => {
    const vals = visibleLabels.flatMap(l => {
      const w = chartWeekMap[l];
      return w ? [w.created, w.completed, w.cancelled] : [0];
    });
    return Math.ceil((Math.max(...vals, 0) + 20000) / 10000) * 10000;
  }, [visibleLabels, chartWeekMap]);

  // ── Early returns (after all hooks) ──────────────────────────
  if (loadState === 'loading') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>Loading weekly data…</div>
  );
  if (loadState === 'error') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>Could not load weekly data — {errMsg}</div>
  );
  if (!selWeek) return null;

  // ── Derived variables ─────────────────────────────────────────
  const sunDate = toLocalDate(selWeek.startDate);
  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunDate);
    d.setDate(sunDate.getDate() + i);
    return toDateStr(d);
  });
  const isCurWeek = selWeek.key === weeks[0]?.key;

  function toggleYear(yr: number) {
    setSelYears(prev => {
      const next = new Set(prev);
      if (next.has(yr)) { next.delete(yr); } else { next.add(yr); }
      return next.size === 0 ? prev : next;
    });
  }

  function toggleAll() {
    setSelYears(prev => prev.size === allYears.length ? new Set([allYears[0]]) : new Set(allYears));
  }

  function statusStyle(s: string): { background: string; color: string } {
    if (s === 'completed')  return { background: '#e8f8f0', color: '#27ae60' };
    if (s === 'processing') return { background: '#e8f0fb', color: '#2563EB' };
    if (s === 'cancelled')  return { background: '#fde8e8', color: '#e74c3c' };
    if (s === 'pending')    return { background: '#fef3e2', color: '#B86E1A' };
    return { background: '#f0f0f0', color: '#888' };
  }

  function openOrderDetail(id: number) {
    setSelOrder(null);
    setSelOrderLoad('loading');
    setSelOrderErr('');
    fetch(`/api/weekly/order/${id}`)
      .then(r => r.json())
      .then((data: OrderDetail | { error: string }) => {
        if ('error' in data) throw new Error((data as { error: string }).error);
        setSelOrder(data as OrderDetail);
        setSelOrderLoad('done');
      })
      .catch((e: Error) => { setSelOrderErr(e.message); setSelOrderLoad('error'); });
  }

  function openModal(date: string, metric: string, val: number) {
    if (val <= 0) return;
    const m = metric.toLowerCase();
    setModal({ date, metric: m, label: `${metric} — ${fmtDay(date, { weekday: 'short', day: '2-digit', month: 'short' })}` });
    setModalLoad('loading');
    setModalOrders([]);
    setModalErr('');
    fetch(`/api/weekly/orders?date=${date}&metric=${m}`)
      .then(r => r.json())
      .then((data: OrderRow[] | { error: string }) => {
        if (!Array.isArray(data)) throw new Error((data as { error: string }).error);
        setModalOrders(data);
        setModalLoad('done');
      })
      .catch((e: Error) => { setModalErr(e.message); setModalLoad('error'); });
  }

  const chartData = {
    labels: visibleLabels,
    datasets: [
      { label: 'Created',   data: visibleLabels.map(l => chartWeekMap[l]?.created   ?? 0), backgroundColor: '#3498db' },
      { label: 'Completed', data: visibleLabels.map(l => chartWeekMap[l]?.completed ?? 0), backgroundColor: '#27ae60' },
      { label: 'Cancelled', data: visibleLabels.map(l => chartWeekMap[l]?.cancelled ?? 0), backgroundColor: '#e74c3c' },
    ],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { boxWidth: 12, boxHeight: 12, padding: 20 } },
      title:  { display: true, text: 'Weekly', font: { size: 14, weight: 'bold' as const } },
      datalabels: {
        anchor: 'end' as const, align: 'top' as const, rotation: -90,
        font: { size: 8, weight: 'bold' as const },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        color: (ctx: any) => (['#3498db', '#27ae60', '#e74c3c'] as string[])[ctx.datasetIndex],
        formatter: (v: number) => v > 0 ? Math.round(v / 1000) : '',
      },
    },
    scales: {
      x: { ticks: { maxRotation: 90, minRotation: 90, font: { size: 8 } }, grid: { display: false } },
      y: { max: yMax, ticks: { callback: (v: number | string) => Number(v) / 1000 + 'K' }, grid: { color: '#f0f0f0' } },
    },
  };

  const ROW_COLORS = { Completed: '#27ae60', Cancelled: '#e74c3c', Created: '#2563EB' };

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Week picker */}
        <div>
          <label className="wk-label">Week</label>
          <select className="wk-select" value={selKey} onChange={e => setSelKey(e.target.value)}>
            {weeks.map(w => (
              <option key={w.key} value={w.key}>
                {`W${String(w.weekNo).padStart(2,'0')}  ${fmtDay(w.startDate, { day:'2-digit', month:'short' })} – ${fmtDay(w.endDate, { day:'2-digit', month:'short' })}`}
              </option>
            ))}
          </select>
        </div>

        {/* Banner */}
        <div className="wk-card" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {[
            { label: 'Week',  val: `W${String(selWeek.weekNo).padStart(2,'0')}` },
            { label: 'Start', val: fmtDay(selWeek.startDate, { day:'2-digit', month:'short' }) },
            { label: 'End',   val: fmtDay(selWeek.endDate,   { day:'2-digit', month:'short' }) },
            ...(isCurWeek ? [{ label: 'Today', val: `${fmtDay(today, { day:'2-digit', month:'short' })} (${new Date().getDay() + 1}/7)` }] : []),
          ].map(({ label, val }) => (
            <div key={label}>
              <span className="wk-label">{label}</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2c3e50' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Completed', val: fmt(selWeek.completed), color: '#27ae60' },
            { label: 'Cancelled', val: fmt(selWeek.cancelled), color: '#e74c3c' },
            { label: 'Created',   val: fmt(selWeek.created),   color: '#2563EB' },
          ].map(({ label, val, color }) => (
            <div key={label} className="wk-card" style={{ textAlign: 'center' }}>
              <span className="wk-label">{label}</span>
              <div className="wk-kpi" style={{ color }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Daily breakdown table */}
        <div className="wk-card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="wk-tbl">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}></th>
                {dayDates.map(ds => {
                  const isToday = isCurWeek && ds === today;
                  const lbl = toLocalDate(ds).toLocaleDateString('en-GB', { weekday: 'short' });
                  return (
                    <th key={ds} style={{ color: isToday ? '#B86E1A' : undefined, fontWeight: isToday ? 700 : 600 }}>
                      {isToday ? <span style={{ background: '#fef3e2', borderRadius: 4, padding: '1px 5px' }}>{lbl}</span> : lbl}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(['Completed', 'Cancelled', 'Created'] as const).map(metric => (
                <tr key={metric}>
                  <td style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: ROW_COLORS[metric], whiteSpace: 'nowrap', paddingRight: 8 }}>
                    {metric}
                  </td>
                  {dayDates.map(ds => {
                    const day = selWeek.days[ds];
                    const val = day?.[metric.toLowerCase() as keyof typeof day] ?? 0;
                    const isToday = isCurWeek && ds === today;
                    const numVal = val as number;
                    return (
                      <td key={ds} style={{ color: numVal > 0 ? '#333' : '#ccc', fontWeight: isToday ? 700 : undefined, padding: 0 }}>
                        {numVal > 0
                          ? <button className="wk-cell-btn" style={{ fontWeight: isToday ? 700 : undefined, color: ROW_COLORS[metric] }} onClick={() => openModal(ds, metric, numVal)}>{fmtK(numVal)}</button>
                          : <span style={{ display: 'block', textAlign: 'center', padding: '4px 6px' }}>—</span>
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Year + range selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'start' }}>
          <div>
            <span className="wk-label">Year</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              <button className={`wk-yr-btn${selYears.size === allYears.length ? ' active' : ''}`} onClick={toggleAll}>All</button>
              {allYears.map(yr => (
                <button key={yr} className={`wk-yr-btn${selYears.has(yr) ? ' active' : ''}`} onClick={() => toggleYear(yr)}>{yr}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="wk-label">Start</label>
            <select className="wk-select" value={chartStart} onChange={e => setChartStart(e.target.value)}>
              {filteredLabels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="wk-label">End</label>
            <select className="wk-select" value={chartEnd} onChange={e => setChartEnd(e.target.value)}>
              {filteredLabels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Weekly chart */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ height: 320, minWidth: Math.max(visibleLabels.length * 22, 300) }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Order detail modal */}
      {modal && (
        <div className="wk-modal-overlay" onClick={() => setModal(null)}>
          <div className="wk-modal" onClick={e => e.stopPropagation()}>
            <div className="wk-modal-hdr">
              <div>
                <div className="wk-modal-title">{modal.label}</div>
                {modalLoad === 'done' && (
                  <div className="wk-modal-sub">
                    {modalOrders.length} order{modalOrders.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Total: {Math.round(modalOrders.reduce((s, o) => s + o.total, 0)).toLocaleString('en-GB')} EGP
                  </div>
                )}
              </div>
              <button className="wk-modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="wk-modal-body">
              {modalLoad === 'loading' && (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>Loading orders…</div>
              )}
              {modalLoad === 'error' && (
                <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>{modalErr}</div>
              )}
              {modalLoad === 'done' && modalOrders.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>No orders found</div>
              )}
              {modalLoad === 'done' && modalOrders.length > 0 && (
                <table className="wk-ord-tbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th className="right">Items</th>
                      <th className="right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalOrders.map(o => (
                      <tr key={o.id}>
                        <td><button className="wk-ord-num-btn" onClick={() => openOrderDetail(o.id)}>#{o.number}</button></td>
                        <td style={{ color: '#555' }}>{o.customer || '—'}</td>
                        <td className="right" style={{ color: '#888' }}>{o.items}</td>
                        <td className="right" style={{ fontWeight: 600 }}>{Math.round(o.total).toLocaleString('en-GB')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order detail modal */}
      {(selOrderLoad === 'loading' || selOrderLoad === 'done' || selOrderLoad === 'error') && selOrderLoad !== 'idle' && (
        <div className="wk-detail-overlay" onClick={() => { setSelOrder(null); setSelOrderLoad('idle'); }}>
          <div className="wk-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="wk-detail-hdr">
              <div>
                {selOrderLoad === 'loading' && <div style={{ fontSize: 14, fontWeight: 700, color: '#2c3e50' }}>Loading order…</div>}
                {selOrderLoad === 'error'   && <div style={{ fontSize: 14, fontWeight: 700, color: '#b0341e' }}>Error</div>}
                {selOrderLoad === 'done' && selOrder && (
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#2c3e50', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      Order #{selOrder.number}
                      <span className="wk-status" style={statusStyle(selOrder.status)}>{selOrder.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#9e9087', marginTop: 3 }}>{selOrder.dateCreated}{selOrder.dateCompleted && selOrder.dateCompleted !== selOrder.dateCreated ? ` · completed ${selOrder.dateCompleted}` : ''}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="wk-detail-back" onClick={() => { setSelOrder(null); setSelOrderLoad('idle'); }}>← Back</button>
                <button className="wk-modal-close" onClick={() => { setSelOrder(null); setSelOrderLoad('idle'); setModal(null); }}>×</button>
              </div>
            </div>

            <div className="wk-detail-body">
              {selOrderLoad === 'loading' && (
                <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>Loading…</div>
              )}
              {selOrderLoad === 'error' && (
                <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>{selOrderErr}</div>
              )}

              {selOrderLoad === 'done' && selOrder && (<>

                {/* Customer */}
                <div>
                  <div className="wk-section-lbl">Customer</div>
                  <div className="wk-info-grid">
                    <div><span>Name</span>{selOrder.customer.name || '—'}</div>
                    <div><span>Phone</span>{selOrder.customer.phone || '—'}</div>
                    <div style={{ gridColumn: '1 / -1' }}><span>Address</span>{selOrder.customer.address || '—'}</div>
                    {selOrder.customer.email && <div style={{ gridColumn: '1 / -1' }}><span>Email</span>{selOrder.customer.email}</div>}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="wk-section-lbl">Items</div>
                  <table className="wk-items-tbl">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="r" style={{ width: 36 }}>Qty</th>
                        <th className="r" style={{ width: 80 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selOrder.items.map((item, i) => (
                        <tr key={i}>
                          <td style={{ color: '#333' }}>{item.name}</td>
                          <td className="r" style={{ color: '#888' }}>{item.quantity}</td>
                          <td className="r" style={{ fontWeight: 600 }}>{Math.round(item.total).toLocaleString('en-GB')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="wk-totals">
                  {selOrder.shippingTotal > 0 && (
                    <div className="wk-totals-row">
                      <span>{selOrder.shippingMethod || 'Shipping'}</span>
                      <span>{Math.round(selOrder.shippingTotal).toLocaleString('en-GB')}</span>
                    </div>
                  )}
                  {selOrder.discountTotal > 0 && (
                    <div className="wk-totals-row" style={{ color: '#27ae60' }}>
                      <span>Discount</span>
                      <span>− {Math.round(selOrder.discountTotal).toLocaleString('en-GB')}</span>
                    </div>
                  )}
                  {selOrder.fees.map((f, i) => (
                    <div key={i} className="wk-totals-row">
                      <span>{f.name}</span>
                      <span>{Math.round(f.total).toLocaleString('en-GB')}</span>
                    </div>
                  ))}
                  <div className="wk-totals-grand">
                    <span>Total</span>
                    <span>{Math.round(selOrder.total).toLocaleString('en-GB')} EGP</span>
                  </div>
                </div>

                {/* Payment + note */}
                {(selOrder.paymentMethod || selOrder.customerNote) && (
                  <div className="wk-info-grid">
                    {selOrder.paymentMethod && <div><span>Payment</span>{selOrder.paymentMethod}</div>}
                    {selOrder.customerNote  && <div style={{ gridColumn: '1 / -1' }}><span>Note</span>{selOrder.customerNote}</div>}
                  </div>
                )}

              </>)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
