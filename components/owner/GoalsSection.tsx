'use client';

import { useEffect, useState } from 'react';

interface GoalRow {
  month: string;
  salesTgt: number;
  salesAct: number | null;
  mktTgt: number;
  mktAct: number | null;
}

function fmt(val: number | null): string {
  if (val === null || val === 0) return '';
  return Math.round(val).toLocaleString('en-GB');
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
  .goals-full  { display: inline; }
  .goals-short { display: none; }
  @media (max-width: 600px) {
    .goals-tbl th, .goals-tbl td { padding: 5px 6px; font-size: 11px; }
    .goals-sub-th { font-size: 10px !important; letter-spacing: 0 !important; }
    .goals-full  { display: none; }
    .goals-short { display: inline; }
    .goals-roas  { display: none; }
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

export default function GoalsSection() {
  const [rows, setRows]     = useState<GoalRow[]>([]);
  const [year, setYear]     = useState(new Date().getFullYear());
  const [state, setState]   = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

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

  if (state === 'loading') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>
      Loading goals…
    </div>
  );

  if (state === 'error') return (
    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#b0341e' }}>
      Could not load goals — {errMsg}
    </div>
  );

  let tSalesTgt = 0, tSalesAct = 0, tMktTgt = 0, tMktAct = 0;
  rows.forEach(r => {
    tSalesTgt += r.salesTgt;
    tSalesAct += r.salesAct ?? 0;
    tMktTgt   += r.mktTgt;
    tMktAct   += r.mktAct ?? 0;
  });

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
              <Th span={2}><span className="goals-full">{year} Sales</span><span className="goals-short">Sales</span></Th>
              <Th span={2}><span className="goals-full">{year} Marketing</span><span className="goals-short">Mkt</span></Th>
            </tr>
            <tr>
              <Th muted small><span className="goals-full">Target</span><span className="goals-short">Tgt</span></Th>
              <Th muted small><span className="goals-full">Actual</span><span className="goals-short">Act</span></Th>
              <Th muted small><span className="goals-full">Target</span><span className="goals-short">Tgt</span></Th>
              <Th muted small><span className="goals-full">Actual</span><span className="goals-short">Act</span></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const sc   = salesClass(r.salesAct, r.salesTgt);
              const mc   = mktClass(r.mktAct, r.mktTgt);
              const roas = r.mktAct && r.salesAct ? Math.round(r.salesAct / r.mktAct) : null;
              const rowBg = i % 2 === 0 ? '#fff' : '#fdf9f4';
              return (
                <tr key={r.month} style={{ background: rowBg }}>
                  <td className="goals-month-col" style={{ ...tdMonth, background: rowBg }}>{r.month}</td>
                  <td style={tdBase}>{fmt(r.salesTgt)}</td>
                  <td style={{ ...tdBase, color: COLOR[sc], fontWeight: sc !== 'empty' ? 500 : undefined }}>
                    {fmt(r.salesAct)}
                  </td>
                  <td style={tdBase}>{fmt(r.mktTgt)}</td>
                  <td style={{ ...tdBase, color: COLOR[mc], fontWeight: mc !== 'empty' ? 500 : undefined }}>
                    {fmt(r.mktAct)}
                    {roas && <span className="goals-roas" style={{ fontSize: 10, opacity: 0.7 }}> ({roas}x)</span>}
                  </td>
                </tr>
              );
            })}
            <tr>
              {(['Total', fmt(tSalesTgt), fmt(tSalesAct) || '—', fmt(tMktTgt), fmt(tMktAct) || '—'] as string[]).map((v, i) => (
                <td key={i} style={{ background: '#7A4610', color: '#fff', fontWeight: 600, border: '1px solid #7A4610' }}>
                  {v}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
