'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingDots from './LoadingDots';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { MonthEntry, WeekInMonth } from '@/app/api/monthly/route';
import type { OrderRow } from '@/app/api/monthly/orders/route';
import type { OrderDetail } from '@/app/api/weekly/order/[id]/route';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title, ChartDataLabels);

// ─── Helpers ─────────────────────────────────────────────────────
const fmt  = (n: number) => n > 0 ? Math.round(n).toLocaleString('en-GB') : '—';
const fmtK = (n: number) => n > 0 ? Math.round(n / 1000) + 'K' : '—';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDay(dateStr: string, opts: Intl.DateTimeFormatOptions) {
  return toLocalDate(dateStr).toLocaleDateString('en-GB', opts);
}

function sundayOf(dateStr: string): string {
  const d = toLocalDate(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return toDateStr(d);
}

function weekKeyOf(sunStr: string): string {
  const sun  = toLocalDate(sunStr);
  const jan1 = new Date(sun.getFullYear(), 0, 1);
  const diff  = (sun.getTime() - jan1.getTime()) / 86400000;
  const weekNo = Math.floor((diff + jan1.getDay()) / 7) + 1;
  return `${sun.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Return all Sundays whose week overlaps [month 1st … month last day]
function getMonthWeekStarts(year: number, month: number): string[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay    = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay     = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const starts: string[] = [];
  let sun = sundayOf(firstDay);
  while (sun <= lastDay) {
    starts.push(sun);
    const d = toLocalDate(sun);
    d.setDate(d.getDate() + 7);
    sun = toDateStr(d);
  }
  return starts;
}

// "25-05" → "May 25"
function chartLabelDisplay(l: string): string {
  const [yr, mo] = l.split('-');
  return `${MONTH_SHORT[parseInt(mo) - 1]} ${yr}`;
}

// ─── CSS ─────────────────────────────────────────────────────────
const STYLES = `
.mo-card { background:#fff; border:1px solid #E8D9C4; border-radius:12px; padding:10px 12px; }
.mo-label { display:block; font-size:10px; color:#9e9087; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:3px; }
.mo-kpi { font-size:18px; font-weight:700; margin-top:2px; }
.mo-select { width:100%; padding:10px 32px 10px 12px; border-radius:8px; border:1.5px solid #C8AA88; font-size:14px; background:#fff; cursor:pointer; outline:none; font-family:'DM Sans',sans-serif; -webkit-appearance:none; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; }
.mo-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.mo-tbl th { text-align:center; font-size:11px; font-weight:600; padding:4px 6px; color:#888; border-bottom:1px solid #E8D9C4; }
.mo-tbl td { text-align:center; padding:4px 6px; }
.mo-yr-btn { padding:5px 10px; border-radius:6px; border:1.5px solid #C8AA88; background:#fff; color:#7A4610; font-size:12px; font-weight:600; cursor:pointer; }
.mo-yr-btn.active { background:#B86E1A; color:#fff; border-color:#B86E1A; }
.mo-prog-bar { height:6px; background:#f0ebe3; border-radius:3px; overflow:hidden; margin-top:4px; }
.mo-prog-fill { height:100%; background:#B86E1A; border-radius:3px; transition:width 0.6s ease-in-out; }
.mo-kpi-btn { display:block; width:100%; background:none; border:none; padding:0; cursor:pointer; font-family:inherit; text-align:center; }
.mo-kpi-btn .mo-kpi { text-decoration:underline; text-underline-offset:3px; }
.mo-kpi-btn:hover .mo-kpi { opacity:0.75; }
.mo-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; }
.mo-modal { background:#fff; border-radius:16px; width:100%; max-width:580px; max-height:82vh; display:flex; flex-direction:column; box-shadow:0 8px 32px rgba(0,0,0,0.18); }
.mo-modal-hdr { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #E8D9C4; flex-shrink:0; }
.mo-modal-title { font-size:14px; font-weight:700; color:#2c3e50; }
.mo-modal-sub { font-size:11px; color:#9e9087; margin-top:2px; }
.mo-modal-close { border:none; background:none; font-size:22px; line-height:1; cursor:pointer; color:#aaa; padding:0 2px; }
.mo-modal-close:hover { color:#555; }
.mo-modal-body { overflow-y:auto; padding:10px 14px 14px; }
.mo-ord-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.mo-ord-tbl th { font-size:10px; font-weight:700; color:#9e9087; text-transform:uppercase; letter-spacing:0.6px; padding:6px 8px; border-bottom:1px solid #E8D9C4; text-align:left; white-space:nowrap; }
.mo-ord-tbl th.right { text-align:right; }
.mo-ord-tbl td { padding:7px 8px; border-bottom:1px solid #f5f0ea; }
.mo-ord-tbl tr:last-child td { border-bottom:none; }
.mo-ord-tbl tr:hover td { background:#faf7f3; }
.mo-ord-tbl .right { text-align:right; }
.mo-ord-num-btn { background:none; border:none; padding:0; cursor:pointer; font-weight:700; color:#7A4610; font-size:12px; font-family:inherit; }
.mo-ord-num-btn:hover { text-decoration:underline; color:#B86E1A; }
.mo-detail-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:1010; display:flex; align-items:center; justify-content:center; padding:16px; }
.mo-detail-modal { background:#fff; border-radius:16px; width:100%; max-width:520px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 12px 40px rgba(0,0,0,0.22); }
.mo-detail-hdr { display:flex; align-items:flex-start; justify-content:space-between; padding:14px 16px 12px; border-bottom:1px solid #E8D9C4; flex-shrink:0; }
.mo-detail-body { overflow-y:auto; padding:12px 16px 16px; display:flex; flex-direction:column; gap:12px; }
.mo-status { display:inline-block; padding:2px 9px; border-radius:10px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-left:8px; vertical-align:middle; }
.mo-section-lbl { font-size:10px; color:#9e9087; text-transform:uppercase; font-weight:700; letter-spacing:0.6px; margin-bottom:5px; }
.mo-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 12px; font-size:12px; color:#444; }
.mo-info-grid span { color:#888; font-size:11px; display:block; }
.mo-items-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.mo-items-tbl th { font-size:10px; font-weight:700; color:#9e9087; text-transform:uppercase; padding:4px 0; border-bottom:1px solid #E8D9C4; text-align:left; }
.mo-items-tbl th.r { text-align:right; }
.mo-items-tbl td { padding:6px 0; border-bottom:1px solid #f5f0ea; vertical-align:top; }
.mo-items-tbl tr:last-child td { border-bottom:none; }
.mo-items-tbl .r { text-align:right; }
.mo-totals { border-top:1px solid #E8D9C4; padding-top:8px; display:flex; flex-direction:column; gap:3px; font-size:12px; }
.mo-totals-row { display:flex; justify-content:space-between; color:#666; }
.mo-totals-grand { display:flex; justify-content:space-between; font-size:14px; font-weight:700; color:#2c3e50; border-top:1px solid #E8D9C4; padding-top:6px; margin-top:4px; }
.mo-detail-back { background:none; border:none; font-size:13px; color:#7A4610; cursor:pointer; padding:0; font-family:inherit; display:flex; align-items:center; gap:4px; }
.mo-detail-back:hover { text-decoration:underline; }
`;

// ─── Component ───────────────────────────────────────────────────
export default function MonthlySection() {
  const [months, setMonths]     = useState<MonthEntry[]>([]);
  const [selKey, setSelKey]     = useState('');
  const [selYears, setSelYears] = useState<Set<number>>(new Set());
  const [chartStart, setChartStart] = useState('');
  const [chartEnd, setChartEnd]     = useState('');
  const [loadState, setLoad]    = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErr]        = useState('');
  const [modal, setModal]       = useState<{ metric: string; label: string } | null>(null);
  const [modalOrders, setModalOrders] = useState<OrderRow[]>([]);
  const [modalLoad, setModalLoad]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [modalErr, setModalErr]       = useState('');
  const [selOrder, setSelOrder]       = useState<OrderDetail | null>(null);
  const [selOrderLoad, setSelOrderLoad] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [selOrderErr, setSelOrderErr] = useState('');

  useEffect(() => {
    fetch('/api/monthly')
      .then(r => r.json())
      .then((data: MonthEntry[] | { error: string }) => {
        if (!Array.isArray(data)) throw new Error((data as { error: string }).error);
        setMonths(data);
        setSelKey(data[0]?.key ?? '');
        setSelYears(new Set([new Date().getFullYear()]));
        setLoad('done');
      })
      .catch((e: Error) => { setErr(e.message); setLoad('error'); });
  }, []);

  const allChartLabels = useMemo(() =>
    [...months].reverse()
      .filter(m => m.completed > 0 || m.cancelled > 0 || m.created > 0)
      .map(m => m.chartLabel),
    [months]
  );

  const allYears = useMemo(() => {
    const ys = new Set(months.map(m => m.year));
    return [...ys].sort((a, b) => b - a);
  }, [months]);

  const filteredLabels = useMemo(() =>
    allChartLabels.filter(l => {
      const yr = parseInt('20' + l.slice(0, 2));
      return selYears.has(yr);
    }),
    [allChartLabels, selYears]
  );

  useEffect(() => {
    if (!filteredLabels.length) return;
    setChartStart(prev => filteredLabels.includes(prev) ? prev : filteredLabels[0]);
    setChartEnd(prev => filteredLabels.includes(prev) ? prev : filteredLabels[filteredLabels.length - 1]);
  }, [filteredLabels]);

  const chartMonthMap = useMemo(() => {
    const m: Record<string, MonthEntry> = {};
    months.forEach(mo => { m[mo.chartLabel] = mo; });
    return m;
  }, [months]);

  const visibleLabels = useMemo(() => {
    if (!chartStart || !chartEnd) return filteredLabels;
    return filteredLabels.filter(l => l >= chartStart && l <= chartEnd);
  }, [filteredLabels, chartStart, chartEnd]);

  const selMonth = useMemo(() => months.find(m => m.key === selKey) ?? null, [months, selKey]);

  // Must be before early returns
  const yMax = useMemo(() => {
    const vals = visibleLabels.flatMap(l => {
      const m = chartMonthMap[l];
      return m ? [m.created, m.completed, m.cancelled] : [0];
    });
    return Math.ceil((Math.max(...vals, 0) + 20000) / 10000) * 10000;
  }, [visibleLabels, chartMonthMap]);

  // ── Early returns ─────────────────────────────────────────────
  if (loadState === 'loading') return <LoadingDots label="Loading monthly data" />;
  if (loadState === 'error') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>Could not load monthly data — {errMsg}</div>
  );
  if (!selMonth) return null;

  // ── Derived ───────────────────────────────────────────────────
  const today        = new Date();
  const isCurMonth   = selMonth.year === today.getFullYear() && selMonth.month === today.getMonth() + 1;
  const daysInMonth  = new Date(selMonth.year, selMonth.month, 0).getDate();
  const monthPct     = isCurMonth ? Math.round(today.getDate() / daysInMonth * 100) : 100;
  const startDate    = `${selMonth.key}-01`;
  const endDateObj   = new Date(selMonth.year, selMonth.month, 0);
  const endDate      = toDateStr(endDateObj);

  // Build week rows for the table (all weeks overlapping this month)
  const weekStarts  = getMonthWeekStarts(selMonth.year, selMonth.month);
  const weeksMap: Record<string, WeekInMonth> = {};
  selMonth.weeks.forEach(w => { weeksMap[w.key] = w; });

  const tableWeeks = weekStarts.map((sunStr, i) => {
    const sat    = new Date(toLocalDate(sunStr));
    sat.setDate(toLocalDate(sunStr).getDate() + 6);
    const endDt  = toDateStr(sat);
    const key    = weekKeyOf(sunStr);
    const data   = weeksMap[key];
    return {
      label: `W${i + 1}`,
      rangeLabel: `${fmtDay(sunStr, { day: '2-digit', month: 'short' })} – ${fmtDay(endDt, { day: '2-digit', month: 'short' })}`,
      completed: data?.completed ?? 0,
      cancelled: data?.cancelled ?? 0,
      created:   data?.created   ?? 0,
    };
  });

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

  function openModal(metric: string, val: number) {
    if (val <= 0) return;
    const m = metric.toLowerCase();
    setModal({ metric: m, label: `${metric} — ${MONTH_FULL[selMonth!.month - 1]} ${selMonth!.year}` });
    setModalLoad('loading');
    setModalOrders([]);
    setModalErr('');
    fetch(`/api/monthly/orders?month=${selMonth!.key}&metric=${m}`)
      .then(r => r.json())
      .then((data: OrderRow[] | { error: string }) => {
        if (!Array.isArray(data)) throw new Error((data as { error: string }).error);
        setModalOrders(data);
        setModalLoad('done');
      })
      .catch((e: Error) => { setModalErr(e.message); setModalLoad('error'); });
  }

  const ROW_COLORS = { Completed: '#27ae60', Cancelled: '#e74c3c', Created: '#2563EB' };

  const chartData = {
    labels: visibleLabels,
    datasets: [
      { label: 'Created',   data: visibleLabels.map(l => chartMonthMap[l]?.created   ?? 0), backgroundColor: '#3498db' },
      { label: 'Completed', data: visibleLabels.map(l => chartMonthMap[l]?.completed ?? 0), backgroundColor: '#27ae60' },
      { label: 'Cancelled', data: visibleLabels.map(l => chartMonthMap[l]?.cancelled ?? 0), backgroundColor: '#e74c3c' },
    ],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { boxWidth: 12, boxHeight: 12, padding: 20 } },
      title:  { display: true, text: 'Monthly', font: { size: 14, weight: 'bold' as const } },
      datalabels: {
        anchor: 'end' as const, align: 'top' as const, rotation: -90,
        font: { size: 8, weight: 'bold' as const },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        color: (ctx: any) => (['#3498db', '#27ae60', '#e74c3c'] as string[])[ctx.datasetIndex],
        formatter: (v: number) => v > 0 ? Math.round(v / 1000) : '',
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 90, minRotation: 90, font: { size: 8 },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (_: unknown, index: number) => chartLabelDisplay(visibleLabels[index] ?? ''),
        },
        grid: { display: false },
      },
      y: { max: yMax, ticks: { callback: (v: number | string) => Number(v) / 1000 + 'K' }, grid: { color: '#f0f0f0' } },
    },
  };

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Month picker */}
        <div>
          <label className="mo-label">Month</label>
          <select className="mo-select" value={selKey} onChange={e => setSelKey(e.target.value)}>
            {months.map(m => (
              <option key={m.key} value={m.key}>
                {`${MONTH_FULL[m.month - 1]} ${m.year}`}
              </option>
            ))}
          </select>
        </div>

        {/* Banner */}
        <div className="mo-card" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {[
            { label: 'Month', val: `${MONTH_FULL[selMonth.month - 1]} ${selMonth.year}` },
            { label: 'Start', val: fmtDay(startDate, { day: '2-digit', month: 'short' }) },
            { label: 'End',   val: fmtDay(endDate,   { day: '2-digit', month: 'short' }) },
            ...(isCurMonth ? [{ label: 'Progress', val: `${today.getDate()}/${daysInMonth} days (${monthPct}%)` }] : []),
          ].map(({ label, val }) => (
            <div key={label} style={{ minWidth: label === 'Progress' ? 160 : undefined }}>
              <span className="mo-label">{label}</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2c3e50' }}>{val}</div>
              {label === 'Progress' && (
                <div className="mo-prog-bar" style={{ width: 160 }}>
                  <div className="mo-prog-fill" style={{ width: `${monthPct}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Completed', num: selMonth.completed, val: fmt(selMonth.completed), color: '#27ae60' },
            { label: 'Cancelled', num: selMonth.cancelled, val: fmt(selMonth.cancelled), color: '#e74c3c' },
            { label: 'Created',   num: selMonth.created,   val: fmt(selMonth.created),   color: '#2563EB' },
          ].map(({ label, num, val, color }) => (
            <div key={label} className="mo-card" style={{ textAlign: 'center' }}>
              <span className="mo-label">{label}</span>
              {num > 0 ? (
                <button className="mo-kpi-btn" onClick={() => openModal(label, num)}>
                  <span className="mo-kpi" style={{ color }}>{val}</span>
                </button>
              ) : (
                <div className="mo-kpi" style={{ color }}>{val}</div>
              )}
            </div>
          ))}
        </div>

        {/* Weekly breakdown table */}
        <div className="mo-card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="mo-tbl">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}></th>
                {tableWeeks.map(w => (
                  <th key={w.label}>
                    <div>{w.label}</div>
                    <div style={{ fontSize: 10, color: '#bbb', fontWeight: 500 }}>{w.rangeLabel}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['Completed', 'Cancelled', 'Created'] as const).map(metric => (
                <tr key={metric}>
                  <td style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: ROW_COLORS[metric], whiteSpace: 'nowrap', paddingRight: 8 }}>
                    {metric}
                  </td>
                  {tableWeeks.map((w, i) => {
                    const val = w[metric.toLowerCase() as 'completed' | 'cancelled' | 'created'];
                    return (
                      <td key={i} style={{ color: val > 0 ? '#333' : '#ccc' }}>
                        {fmtK(val)}
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
            <span className="mo-label">Year</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              <button className={`mo-yr-btn${selYears.size === allYears.length ? ' active' : ''}`} onClick={toggleAll}>All</button>
              {allYears.map(yr => (
                <button key={yr} className={`mo-yr-btn${selYears.has(yr) ? ' active' : ''}`} onClick={() => toggleYear(yr)}>{yr}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="mo-label">Start</label>
            <select className="mo-select" value={chartStart} onChange={e => setChartStart(e.target.value)}>
              {filteredLabels.map(l => <option key={l} value={l}>{chartLabelDisplay(l)}</option>)}
            </select>
          </div>
          <div>
            <label className="mo-label">End</label>
            <select className="mo-select" value={chartEnd} onChange={e => setChartEnd(e.target.value)}>
              {filteredLabels.map(l => <option key={l} value={l}>{chartLabelDisplay(l)}</option>)}
            </select>
          </div>
        </div>

        {/* Monthly chart */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ height: 320, minWidth: Math.max(visibleLabels.length * 36, 300) }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Orders list modal */}
      {modal && (
        <div className="mo-modal-overlay" onClick={() => setModal(null)}>
          <div className="mo-modal" onClick={e => e.stopPropagation()}>
            <div className="mo-modal-hdr">
              <div>
                <div className="mo-modal-title">{modal.label}</div>
                {modalLoad === 'done' && (
                  <div className="mo-modal-sub">
                    {modalOrders.length} order{modalOrders.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Total: {Math.round(modalOrders.reduce((s, o) => s + o.total, 0)).toLocaleString('en-GB')} EGP
                  </div>
                )}
              </div>
              <button className="mo-modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="mo-modal-body">
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
                <table className="mo-ord-tbl">
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
                        <td><button className="mo-ord-num-btn" onClick={() => openOrderDetail(o.id)}>{o.number}</button></td>
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
      {(selOrderLoad === 'loading' || selOrderLoad === 'done' || selOrderLoad === 'error') && (
        <div className="mo-detail-overlay" onClick={() => { setSelOrder(null); setSelOrderLoad('idle'); }}>
          <div className="mo-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="mo-detail-hdr">
              <div>
                {selOrderLoad === 'loading' && <div style={{ fontSize: 14, fontWeight: 700, color: '#2c3e50' }}>Loading order…</div>}
                {selOrderLoad === 'error'   && <div style={{ fontSize: 14, fontWeight: 700, color: '#b0341e' }}>Error</div>}
                {selOrderLoad === 'done' && selOrder && (
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#2c3e50', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      Order {selOrder.number}
                      <span className="mo-status" style={statusStyle(selOrder.status)}>{selOrder.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#9e9087', marginTop: 3 }}>{selOrder.dateCreated}{selOrder.dateCompleted && selOrder.dateCompleted !== selOrder.dateCreated ? ` · completed ${selOrder.dateCompleted}` : ''}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="mo-detail-back" onClick={() => { setSelOrder(null); setSelOrderLoad('idle'); }}>← Back</button>
                <button className="mo-modal-close" onClick={() => { setSelOrder(null); setSelOrderLoad('idle'); setModal(null); }}>×</button>
              </div>
            </div>

            <div className="mo-detail-body">
              {selOrderLoad === 'loading' && (
                <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>Loading…</div>
              )}
              {selOrderLoad === 'error' && (
                <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>{selOrderErr}</div>
              )}

              {selOrderLoad === 'done' && selOrder && (<>

                {/* Customer */}
                <div>
                  <div className="mo-section-lbl">Customer</div>
                  <div className="mo-info-grid">
                    <div><span>Name</span>{selOrder.customer.name || '—'}</div>
                    <div><span>Phone</span>{selOrder.customer.phone || '—'}</div>
                    <div style={{ gridColumn: '1 / -1' }}><span>Address</span>{selOrder.customer.address || '—'}</div>
                    {selOrder.customer.email && <div style={{ gridColumn: '1 / -1' }}><span>Email</span>{selOrder.customer.email}</div>}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="mo-section-lbl">Items</div>
                  <table className="mo-items-tbl">
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
                <div className="mo-totals">
                  {selOrder.shippingTotal > 0 && (
                    <div className="mo-totals-row">
                      <span>{selOrder.shippingMethod || 'Shipping'}</span>
                      <span>{Math.round(selOrder.shippingTotal).toLocaleString('en-GB')}</span>
                    </div>
                  )}
                  {selOrder.discountTotal > 0 && (
                    <div className="mo-totals-row" style={{ color: '#27ae60' }}>
                      <span>Discount</span>
                      <span>− {Math.round(selOrder.discountTotal).toLocaleString('en-GB')}</span>
                    </div>
                  )}
                  {selOrder.fees.map((f, i) => (
                    <div key={i} className="mo-totals-row">
                      <span>{f.name}</span>
                      <span>{Math.round(f.total).toLocaleString('en-GB')}</span>
                    </div>
                  ))}
                  <div className="mo-totals-grand">
                    <span>Total</span>
                    <span>{Math.round(selOrder.total).toLocaleString('en-GB')} EGP</span>
                  </div>
                </div>

                {/* Payment + note */}
                {(selOrder.paymentMethod || selOrder.customerNote) && (
                  <div className="mo-info-grid">
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
