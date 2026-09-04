'use client';

import { useEffect, useState } from 'react';
import LoadingDots from './LoadingDots';

interface StatusStat { status: string; count: number; total: number }

interface GoalRow {
  month: string;
  salesTgt: number;
  salesAct: number | null;
  mktTgt: number;
  mktAct: number | null;
  breakdown: StatusStat[] | null;
}

function fmt(val: number | null): string {
  if (val === null || val === 0) return '';
  return Math.round(val / 1000).toLocaleString('en-GB');
}

function fmtFull(val: number): string {
  return Math.round(val).toLocaleString('en-GB');
}

// Order the counted statuses appear in under the green row; the rest follow by value.
const COUNTED = ['completed', 'processing'];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending payment',
  processing: 'Processing',
  'on-hold': 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
  trash: 'Trash',
  'checkout-draft': 'Draft (abandoned checkout)',
};

function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
}

/** Cancelled value ÷ value of every order placed that month. */
function cancelShare(stats: StatusStat[] | null): number | null {
  if (!stats?.length) return null;
  const placed = stats.reduce((s, r) => s + r.total, 0);
  if (!placed) return null;
  return ((stats.find(r => r.status === 'cancelled')?.total ?? 0) / placed) * 100;
}

function salesClass(act: number | null, tgt: number) {
  if (act === null) return 'empty';
  return act >= tgt ? 'good' : 'bad';
}

function mktClass(act: number | null, tgt: number) {
  if (act === null) return 'empty';
  return act <= tgt ? 'good' : 'bad';
}

const COLOR: Record<string, string> = { good: '#2a7a3b', bad: '#b0341e', empty: '#9e9087' };

const STYLES = `
  .goals-tbl { width: 100%; border-collapse: collapse; table-layout: auto; }
  .goals-tbl th, .goals-tbl td {
    text-align: center; border: 1px solid #C8AA88;
    white-space: nowrap; padding: 8px 14px; font-size: 13px;
  }
  .goals-month-col { position: sticky; left: 0; z-index: 1; }
  @media (max-width: 600px) {
    .goals-tbl th, .goals-tbl td { padding: 5px 6px; font-size: 11px; }
    .goals-sub-th { font-size: 10px !important; letter-spacing: 0 !important; }
  }
`;

function Th({ children, span, rowSpan, muted, small, sticky }: {
  children: React.ReactNode; span?: number; rowSpan?: number;
  muted?: boolean; small?: boolean; sticky?: boolean;
}) {
  return (
    <th
      colSpan={span} rowSpan={rowSpan}
      className={`${small ? 'goals-sub-th' : ''} ${sticky ? 'goals-month-col' : ''}`}
      style={{
        fontWeight: 600,
        background: muted ? '#FBF5EC' : '#B86E1A',
        color: muted ? '#7A6F65' : '#fff',
        letterSpacing: small ? '0.6px' : undefined,
        textTransform: small ? 'uppercase' : undefined,
      }}
    >
      {children}
    </th>
  );
}

function BreakdownModal({ row, year, onClose }: { row: GoalRow; year: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stats   = row.breakdown ?? [];
  const placed  = stats.reduce((s, r) => s + r.total, 0);
  const orders  = stats.reduce((s, r) => s + r.count, 0);
  const counted = stats.filter(r => COUNTED.includes(r.status));
  const cnTotal = counted.reduce((s, r) => s + r.total, 0);
  const cnCount = counted.reduce((s, r) => s + r.count, 0);
  const cancel  = stats.find(r => r.status === 'cancelled') ?? { count: 0, total: 0 };

  // Completed, then processing, then every other status by value.
  const ordered = [
    ...COUNTED.map(s => stats.find(r => r.status === s)).filter((r): r is StatusStat => !!r),
    ...stats.filter(r => !COUNTED.includes(r.status)),
  ];

  const pctValue = placed  ? (cancel.total / placed)  * 100 : 0;
  const pctCount = orders  ? (cancel.count / orders)  * 100 : 0;

  const pct = (val: number) => (placed ? `${((val / placed) * 100).toFixed(1)}%` : '—');

  const cell: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid #EADFD0' };
  const num: React.CSSProperties  = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(28,26,23,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 10, width: '100%', maxWidth: 420,
          maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#B86E1A', color: '#fff', padding: '12px 14px',
          borderRadius: '10px 10px 0 0',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {row.month} {year} — orders placed
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#fff', fontSize: 20,
              lineHeight: 1, cursor: 'pointer', padding: '0 2px',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FBF5EC', color: '#7A6F65', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              <th style={{ ...cell, textAlign: 'left', fontWeight: 600 }}>Status</th>
              <th style={{ ...num, fontWeight: 600 }}>Orders</th>
              <th style={{ ...num, fontWeight: 600 }}>Value</th>
              <th style={{ ...num, fontWeight: 600 }}>% of value</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#F3FAF4', color: '#2a7a3b', fontWeight: 600 }}>
              <td style={cell}>Processing + completed</td>
              <td style={num}>{cnCount.toLocaleString('en-GB')}</td>
              <td style={num}>{fmtFull(cnTotal)}</td>
              <td style={num}>{pct(cnTotal)}</td>
            </tr>
            {ordered.map(s => (
              <tr key={s.status} style={{ color: s.status === 'cancelled' ? '#b0341e' : '#1C1A17' }}>
                <td style={{ ...cell, paddingLeft: COUNTED.includes(s.status) ? 24 : 10 }}>
                  {COUNTED.includes(s.status) && <span style={{ opacity: 0.5 }}>↳ </span>}
                  {statusLabel(s.status)}
                </td>
                <td style={num}>{s.count.toLocaleString('en-GB')}</td>
                <td style={num}>{fmtFull(s.total)}</td>
                <td style={num}>{pct(s.total)}</td>
              </tr>
            ))}
            <tr style={{ background: '#7A4610', color: '#fff', fontWeight: 600 }}>
              <td style={{ ...cell, borderBottom: 'none' }}>Placed (all statuses)</td>
              <td style={{ ...num, borderBottom: 'none' }}>{orders.toLocaleString('en-GB')}</td>
              <td style={{ ...num, borderBottom: 'none' }}>{fmtFull(placed)}</td>
              <td style={{ ...num, borderBottom: 'none' }}>100%</td>
            </tr>
          </tbody>
        </table>

        <div style={{ padding: '12px 14px', borderTop: '1px solid #EADFD0' }}>
          <div style={{ fontSize: 13, color: '#1C1A17' }}>
            Cancellation rate:{' '}
            <b style={{ color: '#b0341e' }}>{pctValue.toFixed(1)}%</b> by value ·{' '}
            <b style={{ color: '#b0341e' }}>{pctCount.toFixed(1)}%</b> by order count
          </div>
          <div style={{ fontSize: 11, color: '#7A6F65', marginTop: 6, lineHeight: 1.5 }}>
            Cancelled ÷ all orders placed in {row.month}. Values are gross order totals
            (incl. shipping &amp; tax); refunds are not deducted.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GoalsSection() {
  const [rows, setRows]     = useState<GoalRow[]>([]);
  const [year, setYear]     = useState(new Date().getFullYear());
  const [state, setState]   = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [openRow, setOpenRow] = useState<GoalRow | null>(null);

  useEffect(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then((data: { rows: GoalRow[]; year: number; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setRows(data.rows);
        setYear(data.year);
        setState('done');
      })
      .catch((e: Error) => { setErrMsg(e.message); setState('error'); });
  }, []);

  if (state === 'loading') return <LoadingDots label="Loading goals" />;

  if (state === 'error') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>
      Could not load goals — {errMsg}
    </div>
  );

  let tSalesTgt = 0, tSalesAct = 0, tMktTgt = 0, tMktAct = 0;
  let tPlaced = 0, tCancelled = 0;
  rows.forEach(r => {
    tSalesTgt += r.salesTgt;
    tSalesAct += r.salesAct ?? 0;
    tMktTgt   += r.mktTgt;
    tMktAct   += r.mktAct ?? 0;
    (r.breakdown ?? []).forEach(s => {
      tPlaced += s.total;
      if (s.status === 'cancelled') tCancelled += s.total;
    });
  });
  const tCancelPct = tPlaced ? `${((tCancelled / tPlaced) * 100).toFixed(1)}%` : '—';

  const tdBase: React.CSSProperties = { color: '#1C1A17' };
  const tdMonth: React.CSSProperties = { ...tdBase, background: '#FBF5EC', color: '#7A6F65', fontWeight: 500 };

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ padding: '10px 12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="goals-tbl">
          <thead>
            <tr>
              <Th muted sticky rowSpan={2}>Month</Th>
              <Th span={3}>Sales</Th>
              <Th span={2}>Marketing</Th>
            </tr>
            <tr>
              <Th muted small>Target</Th>
              <Th muted small>Actual *</Th>
              <Th muted small>Cancel %</Th>
              <Th muted small>Target</Th>
              <Th muted small>Actual</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const sc   = salesClass(r.salesAct, r.salesTgt);
              const mc   = mktClass(r.mktAct, r.mktTgt);
              const roas = r.mktAct && r.salesAct ? Math.round(r.salesAct / r.mktAct) : null;
              const rowBg = i % 2 === 0 ? '#fff' : '#fdf9f4';
              const hasBreakdown = !!r.breakdown?.length;
              const cancelPct = cancelShare(r.breakdown);
              return (
                <tr key={r.month} style={{ background: rowBg }}>
                  <td className="goals-month-col" style={{ ...tdMonth, background: rowBg }}>{r.month}</td>
                  <td style={tdBase}>{fmt(r.salesTgt)}</td>
                  <td
                    onClick={() => hasBreakdown && setOpenRow(r)}
                    title={hasBreakdown ? 'Show status breakdown' : undefined}
                    style={{
                      ...tdBase, color: COLOR[sc],
                      fontWeight: sc !== 'empty' ? 500 : undefined,
                      cursor: hasBreakdown ? 'pointer' : undefined,
                      textDecoration: hasBreakdown ? 'underline dotted' : undefined,
                      textUnderlineOffset: 3,
                    }}
                  >
                    {fmt(r.salesAct)}
                  </td>
                  <td style={{ ...tdBase, color: cancelPct === null ? undefined : '#b0341e' }}>
                    {cancelPct === null ? '' : `${cancelPct.toFixed(1)}%`}
                  </td>
                  <td style={tdBase}>{fmt(r.mktTgt)}</td>
                  <td style={{ ...tdBase, color: COLOR[mc], fontWeight: mc !== 'empty' ? 500 : undefined }}>
                    {fmt(r.mktAct)}
                    {roas && <span style={{ fontSize: 10, opacity: 0.7 }}> ({roas}x)</span>}
                  </td>
                </tr>
              );
            })}
            <tr>
              {(['Total', fmt(tSalesTgt), fmt(tSalesAct) || '—', tCancelPct, fmt(tMktTgt), fmt(tMktAct) || '—'] as string[]).map((v, i) => (
                <td key={i} style={{ background: '#7A4610', color: '#fff', fontWeight: 600, border: '1px solid #7A4610' }}>
                  {v}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ padding: '0 12px 12px', fontSize: 11, lineHeight: 1.5, color: '#7A6F65' }}>
        * Sales actual = orders <b>placed</b> in that month with status <b>processing</b> or{' '}
        <b>completed</b>. Gross order total (incl. shipping &amp; tax); refunds are not deducted.
        Click a figure for the full status breakdown.
      </div>
      {openRow && <BreakdownModal row={openRow} year={year} onClose={() => setOpenRow(null)} />}
    </>
  );
}
