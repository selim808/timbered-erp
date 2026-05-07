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

const td: React.CSSProperties = {
  textAlign: 'center', padding: '8px 14px',
  border: '1px solid #C8AA88', whiteSpace: 'nowrap',
  fontSize: 13, color: '#1C1A17',
};

function Th({ children, span, rowSpan, muted, small }: {
  children: React.ReactNode; span?: number; rowSpan?: number; muted?: boolean; small?: boolean;
}) {
  return (
    <th
      colSpan={span} rowSpan={rowSpan}
      style={{
        textAlign: 'center', padding: '8px 14px',
        border: '1px solid #C8AA88', whiteSpace: 'nowrap',
        fontSize: small ? 11 : 13, fontWeight: 600,
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

  return (
    <div style={{ padding: '10px 12px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr>
            <Th muted rowSpan={2}>Month</Th>
            <Th span={2}>{year} Sales</Th>
            <Th span={2}>{year} Marketing</Th>
          </tr>
          <tr>
            <Th muted small>Target</Th>
            <Th muted small>Actual</Th>
            <Th muted small>Target</Th>
            <Th muted small>Actual</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const sc   = salesClass(r.salesAct, r.salesTgt);
            const mc   = mktClass(r.mktAct, r.mktTgt);
            const roas = r.mktAct && r.salesAct ? Math.round(r.salesAct / r.mktAct) : null;
            return (
              <tr key={r.month} style={{ background: i % 2 === 0 ? '#fff' : '#fdf9f4' }}>
                <td style={td}>{r.month}</td>
                <td style={td}>{fmt(r.salesTgt)}</td>
                <td style={{ ...td, color: COLOR[sc], fontWeight: sc !== 'empty' ? 500 : undefined }}>
                  {fmt(r.salesAct)}
                </td>
                <td style={td}>{fmt(r.mktTgt)}</td>
                <td style={{ ...td, color: COLOR[mc], fontWeight: mc !== 'empty' ? 500 : undefined }}>
                  {fmt(r.mktAct)}
                  {roas && <span style={{ fontSize: 10, opacity: 0.7 }}> ({roas}x)</span>}
                </td>
              </tr>
            );
          })}
          <tr>
            {(['Total', fmt(tSalesTgt), fmt(tSalesAct) || '—', fmt(tMktTgt), fmt(tMktAct) || '—'] as string[]).map((v, i) => (
              <td key={i} style={{ ...td, background: '#7A4610', color: '#fff', fontWeight: 600, border: '1px solid #7A4610' }}>
                {v}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
