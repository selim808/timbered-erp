'use client';

import { useEffect, useState } from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS, BarElement, BarController, LineElement, LineController, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Title,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { CashFlowPeriod } from '@/app/api/accounting/series/route';
import ChartImage from '@/components/shared/ChartImage';

ChartJS.register(BarElement, BarController, LineElement, LineController, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Title, ChartDataLabels);

const GREEN = '#1e8449', RED = '#c0392b', NET = '#7A4610';
const fmtK = (v: number) => `${Math.round(v / 1000)}K`;

/**
 * Cash in vs expenses (bars) and net (line) per week or month, from the
 * accounting sheet, with download / share buttons. `columns` follow the
 * section's own chart (same labels and range).
 */
export default function CashFlowChart({ by, columns, title, name, minColWidth = 22 }: {
  by: 'week' | 'month';
  /** label: x-axis text; key: the week's Sunday (YYYY-MM-DD) or the month (YYYY-MM). */
  columns: { label: string; key: string }[];
  title: string;
  name: string;
  minColWidth?: number;
}) {
  const [series, setSeries] = useState<Map<string, CashFlowPeriod> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch(`/api/accounting/series?by=${by}`)
      .then(r => r.json())
      .then((d: CashFlowPeriod[] | { error: string }) => {
        if (!live) return;
        if (!Array.isArray(d)) throw new Error(d.error);
        setSeries(new Map(d.map(p => [p.key, p])));
      })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [by]);

  if (error) return <div style={{ fontSize: 12, color: '#b0341e', textAlign: 'center' }}>Cash flow chart unavailable — {error}</div>;
  if (!series) return <div style={{ fontSize: 12, color: '#9e9087', textAlign: 'center' }}>Loading cash flow…</div>;

  const rows = columns.map(c => series.get(c.key) ?? { key: c.key, cashIn: 0, expenses: 0 });
  const cashIn = rows.map(r => r.cashIn);
  const expenses = rows.map(r => r.expenses);
  const net = rows.map(r => r.cashIn - r.expenses);
  const totalIn = cashIn.reduce((s, v) => s + v, 0);
  const totalOut = expenses.reduce((s, v) => s + v, 0);

  const data = {
    labels: columns.map(c => c.label),
    datasets: [
      { type: 'bar' as const, label: 'Cash in', data: cashIn, backgroundColor: GREEN, order: 2 },
      { type: 'bar' as const, label: 'Expenses', data: expenses, backgroundColor: RED, order: 2 },
      {
        type: 'line' as const, label: 'Net', data: net, borderColor: NET, backgroundColor: NET,
        borderWidth: 2, pointRadius: 2, tension: 0, order: 1,
        datalabels: { display: false },
      },
    ],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true, position: 'top' as const,
        // Keep Cash in, Expenses, Net (the line is drawn on top, which would otherwise list it first).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: { boxWidth: 12, boxHeight: 12, padding: 16, sort: (a: any, b: any) => a.datasetIndex - b.datasetIndex },
      },
      title: { display: true, text: title, font: { size: 14, weight: 'bold' as const } },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `${ctx.dataset.label}: ${Math.round(ctx.parsed.y).toLocaleString('en-GB')} EGP`,
        },
      },
      datalabels: {
        anchor: 'end' as const, align: 'top' as const, rotation: -90,
        font: { size: 8, weight: 'bold' as const },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        color: (ctx: any) => (ctx.datasetIndex === 0 ? GREEN : RED),
        formatter: (v: number) => (v > 0 ? Math.round(v / 1000) : ''),
      },
    },
    scales: {
      x: { ticks: { maxRotation: 90, minRotation: by === 'week' ? 90 : 0, font: { size: by === 'week' ? 8 : 10 } }, grid: { display: false } },
      y: { grace: '12%', ticks: { callback: (v: number | string) => fmtK(Number(v)) }, grid: { color: '#f0f0f0' } },
    },
  };

  return (
    <ChartImage name={name} title={title}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#7A6F65', marginBottom: 2 }}>
        <span>Cash in <b style={{ color: GREEN }}>{totalIn.toLocaleString('en-GB')}</b></span>
        <span>Expenses <b style={{ color: RED }}>{totalOut.toLocaleString('en-GB')}</b></span>
        <span>Net <b style={{ color: totalIn - totalOut >= 0 ? GREEN : RED }}>{totalIn - totalOut >= 0 ? '+' : '−'}{Math.abs(totalIn - totalOut).toLocaleString('en-GB')}</b></span>
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ height: 320, minWidth: Math.max(columns.length * minColWidth, 300) }}>
          <Chart type="bar" data={data} options={options} />
        </div>
      </div>
    </ChartImage>
  );
}
