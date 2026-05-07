'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { WeekEntry } from '@/app/api/weekly/route';

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

  if (loadState === 'loading') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>Loading weekly data…</div>
  );
  if (loadState === 'error') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>Could not load weekly data — {errMsg}</div>
  );
  if (!selWeek) return null;

  // ── Daily table ───────────────────────────────────────────────
  const sunDate  = toLocalDate(selWeek.startDate);
  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunDate);
    d.setDate(sunDate.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });

  const isCurWeek = selWeek.key === weeks[0]?.key;

  // ── Year toggle ───────────────────────────────────────────────
  function toggleYear(yr: number) {
    setSelYears(prev => {
      const next = new Set(prev);
      if (next.has(yr)) { if (next.size > 1) next.delete(yr); }
      else next.add(yr);
      return next;
    });
  }

  function toggleAll() {
    setSelYears(prev =>
      prev.size === allYears.length ? new Set([new Date().getFullYear()]) : new Set(allYears)
    );
  }

  // ── Chart ─────────────────────────────────────────────────────
  const yMax = useMemo(() => {
    const vals = visibleLabels.flatMap(l => {
      const w = chartWeekMap[l];
      return w ? [w.created, w.completed, w.cancelled] : [0];
    });
    return Math.ceil((Math.max(...vals, 0) + 20000) / 10000) * 10000;
  }, [visibleLabels, chartWeekMap]);

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
                    return (
                      <td key={ds} style={{ color: (val as number) > 0 ? '#333' : '#ccc', fontWeight: isToday ? 700 : undefined }}>
                        {fmtK(val as number)}
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
    </>
  );
}
