'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { MonthEntry, WeekInMonth } from '@/app/api/monthly/route';

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
  if (loadState === 'loading') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>Loading monthly data…</div>
  );
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
            { label: 'Completed', val: fmt(selMonth.completed), color: '#27ae60' },
            { label: 'Cancelled', val: fmt(selMonth.cancelled), color: '#e74c3c' },
            { label: 'Created',   val: fmt(selMonth.created),   color: '#2563EB' },
          ].map(({ label, val, color }) => (
            <div key={label} className="mo-card" style={{ textAlign: 'center' }}>
              <span className="mo-label">{label}</span>
              <div className="mo-kpi" style={{ color }}>{val}</div>
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
    </>
  );
}
