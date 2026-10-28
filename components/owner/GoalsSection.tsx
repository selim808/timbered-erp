'use client';

import { useEffect, useState } from 'react';
import LoadingDots from './LoadingDots';

interface StatusStat { status: string; count: number; total: number }

interface GoalRow {
  month: string;
  /** null for past years, which have no plan. */
  salesTgt: number | null;
  salesAct: number | null;
  mktTgt: number | null;
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

const MONTH_NUM: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
}

interface StatusShares { comp: number; proc: number; other: number }

/** Completed / processing / everything-else (cancelled, on-hold, draft, etc.) as whole-number % of value placed. */
function statusShares(stats: StatusStat[] | null): StatusShares | null {
  if (!stats?.length) return null;
  const placed = stats.reduce((s, r) => s + r.total, 0);
  if (!placed) return null;
  const comp = Math.round(((stats.find(r => r.status === 'completed')?.total ?? 0) / placed) * 100);
  const proc = Math.round(((stats.find(r => r.status === 'processing')?.total ?? 0) / placed) * 100);
  return { comp, proc, other: 100 - comp - proc };
}

function StatusBar({ shares }: { shares: StatusShares }) {
  const segs = [
    { pct: shares.comp,  bg: '#2ecc71' },
    { pct: shares.proc,  bg: '#2980b9' },
    { pct: shares.other, bg: '#e74c3c' },
  ].filter(s => s.pct > 0);
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: 24, overflow: 'hidden' }}>
      {segs.map((s, i) => (
        <div
          key={i}
          style={{
            width: `${s.pct}%`, background: s.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1,
          }}
        >
          {s.pct}
        </div>
      ))}
    </div>
  );
}

function salesClass(act: number | null, tgt: number | null) {
  if (act === null) return 'empty';
  if (tgt === null) return 'plain';
  return act >= tgt ? 'good' : 'bad';
}

function mktClass(act: number | null, tgt: number | null) {
  if (act === null) return 'empty';
  if (tgt === null) return 'plain';
  return act <= tgt ? 'good' : 'bad';
}

const COLOR: Record<string, string> = { good: '#2a7a3b', bad: '#b0341e', empty: '#9e9087', plain: '#1C1A17' };

/** First year shown under "previous years"; it starts in October. */
const HISTORY_START_YEAR = 2024;
const HISTORY_START_LABEL = 'from Oct';

const STYLES = `
  .goals-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .goals-tbl th, .goals-tbl td {
    text-align: center; border: 1px solid #C8AA88;
    white-space: nowrap; padding: 8px 14px; font-size: 13px;
  }
  .goals-tbl td { overflow: hidden; }
  .goals-month-col { position: sticky; left: 0; z-index: 1; padding: 8px 2px !important; text-align: center; }
  @media (max-width: 600px) {
    .goals-tbl th, .goals-tbl td { padding: 5px 6px; font-size: 11px; }
    .goals-sub-th { font-size: 10px !important; letter-spacing: 0 !important; }
  }
`;

function Th({ children, span, rowSpan, muted, small, sticky, narrow }: {
  children: React.ReactNode; span?: number; rowSpan?: number;
  muted?: boolean; small?: boolean; sticky?: boolean; narrow?: boolean;
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
        padding: narrow ? '8px 6px' : undefined,
      }}
    >
      {sticky ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {children}
        </div>
      ) : children}
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

type GoalsData = { rows: GoalRow[]; year: number };

async function fetchGoals(year?: number): Promise<GoalsData> {
  const r = await fetch(year ? `/api/goals?year=${year}` : '/api/goals');
  const data = await r.json() as GoalsData & { error?: string };
  if (data.error) throw new Error(data.error);
  return data;
}

function LoadError({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>
      Could not load goals — {msg}
    </div>
  );
}

/** A finished year, collapsed until opened; its numbers load on first open. */
function PastYear({ year }: { year: number }) {
  const [open, setOpen]     = useState(false);
  const [data, setData]     = useState<GoalsData | null>(null);
  const [errMsg, setErrMsg] = useState('');

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data) {
      setErrMsg('');
      fetchGoals(year).then(setData).catch((e: Error) => setErrMsg(e.message));
    }
  }

  return (
    <div style={{ borderTop: '1px solid #E8D9C4' }}>
      <button
        onClick={toggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          fontSize: 13, fontWeight: 700, color: '#7A4610',
        }}
      >
        <span style={{ display: 'inline-block', transition: 'transform .15s', transform: open ? 'rotate(90deg)' : 'none' }}>▸</span>
        {year}
        {year === HISTORY_START_YEAR && (
          <span style={{ fontSize: 11, fontWeight: 500, color: '#7A6F65' }}>({HISTORY_START_LABEL})</span>
        )}
      </button>
      {open && (
        errMsg ? <LoadError msg={errMsg} />
          : !data ? <LoadingDots label={`Loading ${year}`} />
          : <GoalsTable rows={data.rows} year={data.year} />
      )}
    </div>
  );
}

export default function GoalsSection() {
  const [data, setData]     = useState<GoalsData | null>(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    fetchGoals().then(setData).catch((e: Error) => setErrMsg(e.message));
  }, []);

  if (errMsg) return <LoadError msg={errMsg} />;
  if (!data) return <LoadingDots label="Loading goals" />;

  const pastYears: number[] = [];
  for (let y = data.year - 1; y >= HISTORY_START_YEAR; y--) pastYears.push(y);

  return (
    <>
      <GoalsTable rows={data.rows} year={data.year} />
      <div style={{ padding: '0 12px 12px', fontSize: 11, lineHeight: 1.5, color: '#7A6F65' }}>
        * Sales actual = orders <b>placed</b> in that month with status <b>processing</b> or{' '}
        <b>completed</b>. Gross order total (incl. shipping &amp; tax); refunds are not deducted.
        Click a figure for the full status breakdown.
      </div>
      {pastYears.map(y => <PastYear key={y} year={y} />)}
    </>
  );
}

function GoalsTable({ rows, year }: GoalsData) {
  const [openRow, setOpenRow] = useState<GoalRow | null>(null);

  let tSalesTgt = 0, tSalesAct = 0, tMktTgt = 0, tMktAct = 0;
  let tPlaced = 0, tComp = 0, tProc = 0;
  rows.forEach(r => {
    tSalesTgt += r.salesTgt ?? 0;
    tSalesAct += r.salesAct ?? 0;
    tMktTgt   += r.mktTgt ?? 0;
    tMktAct   += r.mktAct ?? 0;
    (r.breakdown ?? []).forEach(s => {
      tPlaced += s.total;
      if (s.status === 'completed')  tComp += s.total;
      if (s.status === 'processing') tProc += s.total;
    });
  });
  const tShares: StatusShares | null = (() => {
    if (!tPlaced) return null;
    const comp = Math.round((tComp / tPlaced) * 100);
    const proc = Math.round((tProc / tPlaced) * 100);
    return { comp, proc, other: 100 - comp - proc };
  })();
  const tRoas = tMktAct && tSalesAct ? Math.round(tSalesAct / tMktAct) : null;

  const tdBase: React.CSSProperties = { color: '#1C1A17' };
  const tdNarrow: React.CSSProperties = { ...tdBase, padding: '8px 6px' };
  const tdMonth: React.CSSProperties = { ...tdBase, background: '#FBF5EC', color: '#7A6F65', fontWeight: 500 };

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ padding: '10px 12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="goals-tbl">
          <colgroup>
            <col style={{ width: '2ch' }} />
            <col style={{ width: '5ch' }} />
            <col style={{ width: '9ch' }} />
            <col />
            <col style={{ width: '5ch' }} />
            <col style={{ width: '9ch' }} />
          </colgroup>
          <thead>
            <tr>
              <Th muted sticky rowSpan={2}>
                <span style={{ display: 'inline-block', transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>Month</span>
              </Th>
              <Th span={2}>Sales</Th>
              <Th span={1}>Operations</Th>
              <Th span={2}>Marketing</Th>
            </tr>
            <tr>
              <Th muted small narrow>Plan</Th>
              <Th muted small narrow>Actual *</Th>
              <Th muted small>com | pro | can</Th>
              <Th muted small narrow>Plan</Th>
              <Th muted small narrow>Actual</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const sc   = salesClass(r.salesAct, r.salesTgt);
              const mc   = mktClass(r.mktAct, r.mktTgt);
              const roas = r.mktAct && r.salesAct ? Math.round(r.salesAct / r.mktAct) : null;
              const rowBg = i % 2 === 0 ? '#fff' : '#fdf9f4';
              const hasBreakdown = !!r.breakdown?.length;
              const shares = statusShares(r.breakdown);
              return (
                <tr key={r.month} style={{ background: rowBg }}>
                  <td className="goals-month-col" style={{ ...tdMonth, background: rowBg }}>{MONTH_NUM[r.month] ?? r.month}</td>
                  <td style={tdNarrow}>{fmt(r.salesTgt)}</td>
                  <td
                    onClick={() => hasBreakdown && setOpenRow(r)}
                    title={hasBreakdown ? 'Show status breakdown' : undefined}
                    style={{
                      ...tdNarrow, color: COLOR[sc],
                      fontWeight: sc !== 'empty' ? 500 : undefined,
                      cursor: hasBreakdown ? 'pointer' : undefined,
                      textDecoration: hasBreakdown ? 'underline dotted' : undefined,
                      textUnderlineOffset: 3,
                    }}
                  >
                    {fmt(r.salesAct)}
                  </td>
                  <td style={{ padding: 0 }}>
                    {shares && <StatusBar shares={shares} />}
                  </td>
                  <td style={tdNarrow}>{fmt(r.mktTgt)}</td>
                  <td style={{ ...tdNarrow, color: COLOR[mc], fontWeight: mc !== 'empty' ? 500 : undefined }}>
                    {fmt(r.mktAct)}
                    {roas && <span style={{ fontSize: 10, opacity: 0.7 }}> ({roas}x)</span>}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="goals-month-col" style={{ background: '#7A4610', color: '#fff', fontWeight: 600, border: '1px solid #7A4610' }}>Σ</td>
              <td style={{ background: '#7A4610', color: '#fff', fontWeight: 600, border: '1px solid #7A4610', padding: '8px 6px' }}>
                {fmt(tSalesTgt)}
              </td>
              <td style={{ background: '#7A4610', color: '#fff', fontWeight: 600, border: '1px solid #7A4610', padding: '8px 6px' }}>
                {fmt(tSalesAct) || '—'}
              </td>
              <td style={{ background: '#7A4610', border: '1px solid #7A4610', padding: 0 }}>
                {tShares && <StatusBar shares={tShares} />}
              </td>
              <td style={{ background: '#7A4610', color: '#fff', fontWeight: 600, border: '1px solid #7A4610', padding: '8px 6px' }}>
                {fmt(tMktTgt)}
              </td>
              <td style={{ background: '#7A4610', color: '#fff', fontWeight: 600, border: '1px solid #7A4610', padding: '8px 6px' }}>
                {fmt(tMktAct) || '—'}
                {tRoas && <span style={{ fontSize: 10, opacity: 0.7 }}> ({tRoas}x)</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {openRow && <BreakdownModal row={openRow} year={year} onClose={() => setOpenRow(null)} />}
    </>
  );
}
