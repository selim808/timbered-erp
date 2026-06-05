'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, ChartDataLabels);

// ─── Types ───────────────────────────────────────────────────────
interface Round {
  Round: string;
  Start_Date: string | null;
  Duration: number;
  Total_Orders_No: number;
  Total_Orders_Value: number;
  CashIn_Value: number;
  CashIn_No: number;
  Expenses: number;
  Orders_Ceiling: number;
  Ceiling_Gap: number;
  Processing_Value: number;
  Processing_No: number;
  Completed_Value: number;
  Completed_No: number;
  Cash_Minus_Com_Value: number;
  Cash_Minus_Com_No: number;
  Cancelled_Value: number;
  Cancelled_No: number;
  COGS_Value: number;      COGS_Percent: number;
  MRK_Value: number;       MRK_Percent: number;
  FixedCost_Value: number; FixedCost_Percent: number;
  Logistics_Value: number; Logistics_Percent: number;
  Others_Value: number;    Others_Percent: number;
}

// ─── Helpers ─────────────────────────────────────────────────────
const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');
const fmtK = (n: number) => `${Math.round(n / 1000)}K`;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function sumKey(data: Round[], key: keyof Round): number {
  return data.reduce((acc, d) => acc + ((d[key] as number) || 0), 0);
}

function aggregateAll(data: Round[]): Round {
  const cashIn  = sumKey(data, 'CashIn_Value');
  const ceil    = sumKey(data, 'Orders_Ceiling');
  const compVal = sumKey(data, 'Completed_Value');
  const totalExp = sumKey(data, 'Expenses') || 1;
  const cogs = sumKey(data, 'COGS_Value');
  const mrk  = sumKey(data, 'MRK_Value');
  const fix  = sumKey(data, 'FixedCost_Value');
  const log  = sumKey(data, 'Logistics_Value');
  const oth  = sumKey(data, 'Others_Value');
  return {
    Round: 'All', Start_Date: data[0]?.Start_Date ?? null,
    Duration: sumKey(data, 'Duration'),
    Total_Orders_No: sumKey(data, 'Total_Orders_No'),
    Total_Orders_Value: sumKey(data, 'Total_Orders_Value'),
    CashIn_Value: cashIn, CashIn_No: sumKey(data, 'CashIn_No'),
    Expenses: totalExp,
    Orders_Ceiling: ceil, Ceiling_Gap: cashIn - ceil,
    Processing_Value: sumKey(data, 'Processing_Value'),
    Processing_No: sumKey(data, 'Processing_No'),
    Completed_Value: compVal, Completed_No: sumKey(data, 'Completed_No'),
    Cash_Minus_Com_Value: cashIn - compVal,
    Cash_Minus_Com_No: sumKey(data, 'CashIn_No') - sumKey(data, 'Completed_No'),
    Cancelled_Value: sumKey(data, 'Cancelled_Value'),
    Cancelled_No: sumKey(data, 'Cancelled_No'),
    COGS_Value: cogs,      COGS_Percent: cogs / totalExp,
    MRK_Value: mrk,        MRK_Percent: mrk  / totalExp,
    FixedCost_Value: fix,  FixedCost_Percent: fix / totalExp,
    Logistics_Value: log,  Logistics_Percent: log / totalExp,
    Others_Value: oth,     Others_Percent: oth  / totalExp,
  };
}

// ─── Colors ──────────────────────────────────────────────────────
const C = {
  good: '#27ae60', bad: '#e74c3c', neutral: '#2980b9',
  cogs: '#e67e22', marketing: '#3498db', fixed: '#9b59b6',
  logistics: '#f1c40f', others: '#95a5a6',
};

// ─── CSS ─────────────────────────────────────────────────────────
const STYLES = `
.fin-card { background:#fff; border:1px solid #E8D9C4; border-radius:12px; padding:16px; margin-bottom:12px; }
.fin-kpi-card { background:#fff; border:1px solid #E8D9C4; border-radius:12px; padding:14px 16px; }
.fin-label { display:block; font-size:10px; color:#9e9087; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:4px; }
.fin-sec-title { font-size:10px; color:#9e9087; text-transform:uppercase; letter-spacing:1.2px; font-weight:800; text-align:center; margin:16px 0 8px; }
.fin-hval { font-size:16px; font-weight:700; color:#2c3e50; }
.fin-kpi { font-size:22px; font-weight:700; margin-top:4px; }
.fin-kpi-lg { font-size:26px; }
.fin-kpi-sub { font-size:12px; margin-top:3px; color:#888; }
.fin-kpi-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
.fin-kpi-full { grid-column:1 / -1; text-align:center; }
.fin-bar-bg { width:100%; height:16px; background:#f0f0f0; border-radius:10px; overflow:hidden; margin:8px 0; }
.fin-bar { height:100%; border-radius:10px; transition:width 0.8s ease-in-out; }
.fin-bar-wrap { position:relative; margin-bottom:28px; }
.fin-bar-lbl { position:absolute; font-size:11px; font-weight:700; color:#555; white-space:nowrap; transition:left 0.8s ease-in-out; }
.fin-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:13px; font-weight:700; }
.fin-net-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:6px; }
.fin-net { display:inline-block; font-size:12px; font-weight:700; white-space:nowrap; background:white; padding:3px 10px; border-radius:6px; box-shadow:0 1px 4px rgba(0,0,0,0.1); }
.fin-gap-lbl { text-align:right; font-size:13px; margin-top:16px; padding-top:12px; border-top:1px solid #eee; }
.fin-exp-list { list-style:none; padding:0; margin:0; }
.fin-exp-item { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f0f0f0; }
.fin-exp-item:last-child { border-bottom:none; }
.fin-exp-name { font-size:13px; font-weight:600; color:#555; }
.fin-exp-name b { color:#333; font-weight:800; }
.fin-exp-pcts { display:flex; flex-shrink:0; }
.fin-exp-pcts span { width:52px; text-align:right; font-size:13px; font-weight:700; color:#333; }
.fin-exp-head span { width:52px; text-align:right; font-size:9px; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:0.3px; }
.fin-tbl { width:100%; border-collapse:collapse; font-size:13px; }
.fin-tbl th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.8px; color:#9e9087; font-weight:700; padding:0 8px 10px; }
.fin-tbl th:not(:first-child) { text-align:right; }
.fin-tbl td { padding:10px 8px; border-top:1px solid #f0f0f0; font-weight:600; color:#333; }
.fin-tbl td:not(:first-child) { text-align:right; }
.fin-tbl .f-total td { font-weight:700; color:#2c3e50; }
.fin-stage { display:flex; align-items:center; gap:8px; }
.fin-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.fin-pct { display:inline-block; font-size:11px; font-weight:700; padding:2px 7px; border-radius:5px; }
.fin-multi-bar { display:flex; width:100%; height:22px; background:#f0f0f0; border-radius:11px; overflow:hidden; margin-top:10px; }
.fin-seg { height:100%; transition:width 0.8s ease-in-out; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:800; }
.fin-dist-wrap { position:relative; height:20px; margin-top:8px; overflow:visible; margin-bottom:4px; }
.fin-dist-lbl { position:absolute; font-size:10px; color:#999; font-weight:700; text-transform:uppercase; white-space:nowrap; transform:translateX(-50%); transition:left 0.8s ease-in-out; }
@media (min-width:600px) {
  .fin-kpi-grid { grid-template-columns:repeat(3,1fr); }
  .fin-kpi-full { grid-column:auto; text-align:left; }
}
`;

// ─── Main component ───────────────────────────────────────────────
export default function FinanceSection() {
  const [rounds, setRounds]   = useState<Round[]>([]);
  const [selected, setSelected] = useState('__all__');
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErrMsg]   = useState('');

  useEffect(() => {
    fetch('/api/finance')
      .then(r => r.json())
      .then((data: Round[] | { error: string }) => {
        if (!Array.isArray(data)) throw new Error((data as { error: string }).error);
        setRounds(data);
        setSelected(data[data.length - 1]?.Round ?? '__all__');
        setLoadState('done');
      })
      .catch((e: Error) => { setErrMsg(e.message); setLoadState('error'); });
  }, []);

  const d = useMemo<Round | null>(() => {
    if (!rounds.length) return null;
    return selected === '__all__'
      ? aggregateAll(rounds)
      : (rounds.find(r => r.Round === selected) ?? null);
  }, [rounds, selected]);

  if (loadState === 'loading') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>Loading finance…</div>
  );
  if (loadState === 'error') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>Could not load finance — {errMsg}</div>
  );
  if (!d) return null;

  // ── Derived values ────────────────────────────────────────────
  const cashIn = d.CashIn_Value  || 0;
  const exp    = d.Expenses      || 0;
  const ceil   = d.Orders_Ceiling || 0;
  const net    = cashIn - exp;
  const dur    = d.Duration || 1;

  const max     = Math.max(cashIn, exp, ceil) || 1;
  const cashPct = (cashIn / max) * 100;
  const expPct  = (exp    / max) * 100;

  const totalFunnel = (d.Completed_Value || 0) + (d.Processing_Value || 0) + (d.Cancelled_Value || 0) || 1;
  const compPct = Math.round((d.Completed_Value  || 0) / totalFunnel * 100);
  const procPct = Math.round((d.Processing_Value || 0) / totalFunnel * 100);
  const canPct  = Math.round((d.Cancelled_Value  || 0) / totalFunnel * 100);

  const gap     = d.Ceiling_Gap ?? (cashIn - ceil);
  const diffVal = d.Cash_Minus_Com_Value || 0;
  const diffNo  = d.Cash_Minus_Com_No   || 0;
  const opmNo   = Math.round((d.Total_Orders_No    || 0) / dur);
  const opmVal  = Math.round((d.Total_Orders_Value || 0) / dur);

  const ordersVal = d.Total_Orders_Value || 0;
  const expRows = [
    { label: 'COGS',      color: C.cogs,      val: d.COGS_Value      || 0 },
    { label: 'Marketing', color: C.marketing, val: d.MRK_Value        || 0 },
    { label: 'Fixed',     color: C.fixed,     val: d.FixedCost_Value  || 0 },
    { label: 'Logistics', color: C.logistics, val: d.Logistics_Value  || 0 },
    { label: 'Others',    color: C.others,    val: d.Others_Value     || 0 },
  ].map(r => ({
    ...r,
    pctCash:  pct(r.val, cashIn),
    pctExp:   pct(r.val, exp),
    pctOrder: pct(r.val, ordersVal),
  }));

  const startDateStr = d.Start_Date
    ? new Date(d.Start_Date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  // Grouped horizontal bars — each category shows 3 bars: % of Cash, of
  // Expenses, of Orders. Bars are coloured by metric (see legend below).
  const SERIES = [
    { name: '% Cash',  color: '#27ae60', get: (e: typeof expRows[number]) => e.pctCash  },
    { name: '% Exp',   color: '#e67e22', get: (e: typeof expRows[number]) => e.pctExp   },
    { name: '% Order', color: '#2980b9', get: (e: typeof expRows[number]) => e.pctOrder },
  ];
  const chartData = {
    labels: expRows.map(e => e.label),
    datasets: SERIES.map(s => ({
      label: s.name,
      data: expRows.map(s.get),
      backgroundColor: s.color,
      borderRadius: 4,
      barPercentage: 0.82,
      categoryPercentage: 0.72,
    })),
  };
  const maxPct = Math.max(...expRows.map(e => e.pctCash), 10);
  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { right: 26 } },
    scales: {
      x: { display: false, beginAtZero: true, max: Math.ceil(maxPct / 10) * 10 + 6 },
      y: { grid: { display: false }, ticks: { font: { size: 12, weight: 700 as const }, color: '#555' } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}%`,
        },
      },
      datalabels: {
        anchor: 'end' as const, align: 'end' as const, offset: 2,
        color: '#555', font: { weight: 'bold' as const, size: 10 },
        formatter: (value: number) => `${value}%`,
      },
    },
  };

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ padding: '10px 12px' }}>

        {/* ── Round selector ── */}
        <div className="fin-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="fin-label">Round</label>
              <select
                value={selected} onChange={e => setSelected(e.target.value)}
                style={{
                  width: '100%', padding: '10px 32px 10px 12px', borderRadius: 8,
                  border: '1.5px solid #C8AA88', fontSize: 15, background: '#fff',
                  cursor: 'pointer', outline: 'none', fontFamily: "'DM Sans', sans-serif",
                  WebkitAppearance: 'none', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                }}
              >
                <option value="__all__">All Rounds</option>
                {rounds.map(r => <option key={r.Round} value={r.Round}>{r.Round}</option>)}
              </select>
            </div>
            {[
              { label: 'Start date',  val: startDateStr },
              { label: 'Duration',    val: `${Math.round(d.Duration || 0)} m` },
              { label: 'Orders/Mon',  val: <>{opmNo.toLocaleString('en-GB')}<span style={{ fontSize: 12, color: '#888', fontWeight: 600, marginLeft: 5 }}>({fmt(opmVal)})</span></> },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="fin-label">{label}</span>
                <span className="fin-hval">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="fin-kpi-grid">
          <div className="fin-kpi-card fin-kpi-full">
            <span className="fin-label">Net cash flow</span>
            <div className="fin-kpi fin-kpi-lg" style={{ color: net >= 0 ? C.good : C.bad }}>{fmt(net)}</div>
            <div className="fin-kpi-sub" style={{ color: net >= 0 ? C.good : C.bad }}>
              {net / dur >= 0 ? '+' : ''}{Math.round(net / dur / 1000)}K/mon
            </div>
          </div>
          <div className="fin-kpi-card">
            <span className="fin-label">Total cash in</span>
            <div className="fin-kpi">{fmt(cashIn)}</div>
            <div className="fin-kpi-sub">+{Math.round(cashIn / dur / 1000)}K/mon</div>
          </div>
          <div className="fin-kpi-card">
            <span className="fin-label">Total expenses</span>
            <div className="fin-kpi">{fmt(exp)}</div>
            <div className="fin-kpi-sub">+{Math.round(exp / dur / 1000)}K/mon</div>
          </div>
        </div>

        {/* ── Performance bars ── */}
        <p className="fin-sec-title">CashIn – Expenses – Orders</p>
        <div className="fin-card">
          <div className="fin-row"><span>Cash in</span></div>
          <div className="fin-bar-wrap">
            <div className="fin-bar-bg">
              <div className="fin-bar" style={{ width: `${cashPct}%`, background: '#2ecc71' }} />
            </div>
            <div className="fin-bar-lbl" style={{ top: -18, left: `${Math.min(cashPct, 78)}%` }}>
              {fmt(cashIn)} ({Math.round(cashPct)}%)
            </div>
          </div>
          <div className="fin-net-row" style={{ marginTop: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Expenses</span>
            <span className="fin-net" style={{ color: net >= 0 ? C.good : C.bad, border: `1px solid ${net >= 0 ? C.good : C.bad}` }}>
              Net: {fmt(net)}
            </span>
          </div>
          <div className="fin-bar-wrap">
            <div className="fin-bar-bg">
              <div className="fin-bar" style={{ width: `${expPct}%`, background: '#e74c3c' }} />
            </div>
            <div className="fin-bar-lbl" style={{ bottom: -18, left: `${Math.min(expPct, 78)}%` }}>
              {fmt(exp)} ({Math.round(expPct)}%)
            </div>
          </div>
          <div className="fin-row" style={{ marginTop: 10 }}>
            <span>Orders ceiling</span>
            <span style={{ color: C.neutral, fontWeight: 600 }}>{fmt(ceil)}</span>
          </div>
          <div className="fin-gap-lbl">
            Gap to ceiling: <b style={{ color: gap >= 0 ? C.good : C.bad }}>{fmt(gap)}</b>
          </div>
        </div>

        {/* ── Expense breakdown ── */}
        <p className="fin-sec-title">Expense breakdown</p>
        <div className="fin-card">
          <div className="fin-exp-item fin-exp-head" style={{ padding: '0 0 6px', borderBottom: '1px solid #eee' }}>
            <span style={{ flex: 1 }} />
            <div className="fin-exp-pcts">
              <span>% Cash</span>
              <span>% Exp</span>
              <span>% Order</span>
            </div>
          </div>
          <ul className="fin-exp-list">
            {expRows.map(e => (
              <li key={e.label} className="fin-exp-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                  <span className="fin-exp-name">{e.label}: <b>{fmtK(e.val)}</b></span>
                </div>
                <div className="fin-exp-pcts">
                  <span>{e.pctCash}%</span>
                  <span>{e.pctExp}%</span>
                  <span>{e.pctOrder}%</span>
                </div>
              </li>
            ))}
          </ul>
          <div style={{ position: 'relative', height: 260, width: '100%', marginTop: 16 }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginTop: 10, fontSize: 11, color: '#888', fontWeight: 600 }}>
            {[{ n: '% Cash In', c: '#27ae60' }, { n: '% Expenses', c: '#e67e22' }, { n: '% Orders', c: '#2980b9' }].map(l => (
              <span key={l.n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: l.c }} />{l.n}
              </span>
            ))}
          </div>
        </div>

        {/* ── Cash In vs Completed ── */}
        <p className="fin-sec-title">Cash In vs Completed</p>
        <div className="fin-card">
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="fin-tbl" style={{ minWidth: 340 }}>
              <thead>
                <tr>
                  <th></th>
                  <th style={{ textAlign: 'right' }}>Cash In</th>
                  <th style={{ textAlign: 'right' }}>Completed</th>
                  <th style={{ textAlign: 'right' }}>Difference</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Partial Dlv</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Value</td>
                  <td>{fmt(cashIn)}</td>
                  <td>{fmt(d.Completed_Value || 0)}</td>
                  <td style={{ color: diffVal >= 0 ? C.neutral : C.bad, fontWeight: 700 }}>
                    {diffVal >= 0 ? '+' : ''}{fmt(diffVal)}
                  </td>
                  <td style={{ color: C.neutral, fontWeight: 700 }}>—</td>
                </tr>
                <tr>
                  <td>No.</td>
                  <td>{Math.round(d.CashIn_No || 0)}</td>
                  <td>{Math.round(d.Completed_No || 0)}</td>
                  <td style={{ color: diffNo >= 0 ? C.neutral : C.bad, fontWeight: 700 }}>
                    {diffNo >= 0 ? '+' : ''}{Math.round(diffNo)}
                  </td>
                  <td style={{ color: C.neutral, fontWeight: 700 }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Orders funnel ── */}
        <p className="fin-sec-title">Orders funnel</p>
        <div className="fin-card">
          <table className="fin-tbl">
            <thead>
              <tr><th>Stage</th><th>Value</th><th>No.</th><th>% value</th></tr>
            </thead>
            <tbody>
              <tr className="f-total">
                <td><div className="fin-stage"><div className="fin-dot" style={{ background: '#34495e' }} />Total</div></td>
                <td>{fmt(d.Total_Orders_Value || 0)}</td>
                <td>{Math.round(d.Total_Orders_No || 0)}</td>
                <td><span className="fin-pct" style={{ background: '#f0f0f0', color: '#555' }}>100%</span></td>
              </tr>
              {[
                { label: 'Completed',  dot: '#2ecc71', val: d.Completed_Value,  no: d.Completed_No,  pct: compPct, pctBg: '#eafaf1', pctColor: '#1e8449', textColor: C.good },
                { label: 'Processing', dot: '#2980b9', val: d.Processing_Value, no: d.Processing_No, pct: procPct, pctBg: '#eaf4fb', pctColor: '#1a5276', textColor: C.neutral },
                { label: 'Cancelled',  dot: '#e74c3c', val: d.Cancelled_Value,  no: d.Cancelled_No,  pct: canPct,  pctBg: '#fdedec', pctColor: '#922b21', textColor: C.bad },
              ].map(row => (
                <tr key={row.label}>
                  <td><div className="fin-stage"><div className="fin-dot" style={{ background: row.dot }} />{row.label}</div></td>
                  <td style={{ color: row.textColor }}>{fmt(row.val || 0)}</td>
                  <td style={{ color: row.textColor }}>{Math.round(row.no || 0)}</td>
                  <td><span className="fin-pct" style={{ background: row.pctBg, color: row.pctColor }}>{row.pct}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="fin-multi-bar">
            {[
              { pct: compPct, bg: '#2ecc71' },
              { pct: procPct, bg: '#2980b9' },
              { pct: 100 - compPct - procPct, bg: '#e74c3c' },
            ].map((seg, i) => (
              <div key={i} className="fin-seg" style={{ width: `${seg.pct}%`, background: seg.bg }}>
                {seg.pct > 12 ? `${seg.pct}%` : ''}
              </div>
            ))}
          </div>
          <div className="fin-dist-wrap">
            {[
              { label: 'Completed',  left: compPct / 2,                 show: compPct > 8 },
              { label: 'Processing', left: compPct + procPct / 2,       show: procPct > 8 },
              { label: 'Cancelled',  left: compPct + procPct + canPct / 2, show: canPct > 8 },
            ].map(lbl => (
              <span key={lbl.label} className="fin-dist-lbl" style={{ left: `${lbl.left}%`, opacity: lbl.show ? 1 : 0 }}>
                {lbl.label}
              </span>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
