'use client';

import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, CategoryScale,
  LinearScale, Tooltip, Title,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title, ChartDataLabels);

// ─── Types ────────────────────────────────────────────────────────
interface Phase {
  Phases: string;
  'WIP Value': number;
  'WIP No': number;
}

interface ProdData {
  phases: Phase[];
  ordersNo: number;
  itemsNo: number;
  procValue: number;
}

// ─── Phase colour rules ───────────────────────────────────────────
const GREEN_PHASES = new Set([
  'WH-Ready', 'DLV-Bosta', 'DLV-Private', 'Delivered Partially',
]);
const RED_PHASES = new Set([
  'WH-Defected', 'WH-No_Response', 'WH-Postponed', 'WH-Returned',
  'Not Received in WH', 'Not available in WH',
  'DLV-Bareed-Cairo', 'DLV-Bareed-Tanta',
]);
const phaseColor = (p: string) =>
  GREEN_PHASES.has(p) ? '#27ae60' : RED_PHASES.has(p) ? '#e74c3c' : '#3498db';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

// ─── CSS ─────────────────────────────────────────────────────────
const STYLES = `
.prod-kpi-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%; margin-bottom:4px; }
.prod-kpi-card { background:#fff; border:1px solid #E8D9C4; border-radius:12px; padding:14px 16px; text-align:center; }
.prod-label { display:block; font-size:10px; color:#9e9087; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:4px; }
.prod-kpi { font-size:22px; font-weight:700; color:#1C1A17; margin-top:4px; }
.prod-multi-bar { display:flex; width:100%; height:22px; background:#f0f0f0; border-radius:11px; overflow:hidden; }
.prod-seg { height:100%; transition:width 0.8s ease-in-out; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:800; }
.prod-dist-wrap { position:relative; height:20px; margin-top:8px; overflow:visible; margin-bottom:4px; }
.prod-dist-lbl { position:absolute; font-size:10px; color:#999; font-weight:700; text-transform:uppercase; white-space:nowrap; transform:translateX(-50%); transition:left 0.8s ease-in-out; }
`;

// ─── Component ───────────────────────────────────────────────────
export default function ProductionSection() {
  const [data, setData]       = useState<ProdData | null>(null);
  const [loadState, setLoad]  = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErr]      = useState('');

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

  if (loadState === 'loading') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>Loading production…</div>
  );
  if (loadState === 'error') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>Could not load production — {errMsg}</div>
  );
  if (!data) return null;

  const { phases, ordersNo, itemsNo, procValue } = data;

  // ── WIP totals ────────────────────────────────────────────────
  const totalWip = phases.reduce((s, p) => s + (p['WIP Value'] || 0), 0);
  const splitIdx = phases.findIndex(p => p.Phases === 'Rdy for ship');
  const fabPhases = splitIdx >= 0 ? phases.slice(0, splitIdx + 1) : phases;
  const dlvPhases = splitIdx >= 0 ? phases.slice(splitIdx + 1)    : [];
  const fabVal    = fabPhases.reduce((s, p) => s + (p['WIP Value'] || 0), 0);
  const dlvVal    = dlvPhases.reduce((s, p) => s + (p['WIP Value'] || 0), 0);
  const fabPct    = totalWip > 0 ? Math.round(fabVal / totalWip * 100) : 0;
  const dlvPct    = totalWip > 0 ? Math.round(dlvVal / totalWip * 100) : 0;

  const mismatch = totalWip > 0 && procValue > 0 && totalWip !== procValue;

  // ── Bar chart ────────────────────────────────────────────────
  const filtered = phases.filter(p => (p['WIP Value'] || 0) > 0);
  const colors   = filtered.map(p => phaseColor(p.Phases));
  const chartData = {
    labels: filtered.map(p => p.Phases),
    datasets: [{ data: filtered.map(p => p['WIP Value']), backgroundColor: colors, borderWidth: 0 }],
  };
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title:  { display: true, text: 'WIP Breakdown', font: { size: 14, weight: 'bold' as const } },
      datalabels: {
        anchor: 'end' as const, align: 'top' as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        color: (ctx: any) => colors[ctx.dataIndex] as string,
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

      </div>
    </>
  );
}
