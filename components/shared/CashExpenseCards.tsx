'use client';

import { useEffect, useState } from 'react';
import type { AccountingResponse, AccountingSide } from '@/app/api/accounting/route';
import type { PipelineOrder } from '@/app/api/pipeline/orders/route';
import OrderDetailSheet from '@/components/shared/OrderDetailSheet';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** "12 Nov" */
const dayLabel = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short' });
};

const SIDES = {
  cashIn:   { title: 'Cash in',  color: '#1e8449', groupWord: 'method' },
  expenses: { title: 'Expenses', color: '#c0392b', groupWord: 'category' },
} as const;
type SideKey = keyof typeof SIDES;

const STYLES = `
.cx-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.cx-card { background:#fff; border:1px solid #E8D9C4; border-radius:12px; padding:10px; text-align:center; font:inherit; cursor:pointer; }
.cx-card:disabled { cursor:default; }
.cx-lbl { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.8px; color:#9e9087; }
.cx-val { font-size:19px; font-weight:800; margin-top:2px; text-decoration:underline dotted; text-underline-offset:4px; }
.cx-card:disabled .cx-val { text-decoration:none; }
.cx-sub { font-size:11px; color:#7A6F65; margin-top:2px; }
.cx-net { grid-column:1 / -1; text-align:center; font-size:12px; color:#7A6F65; }
.cx-net b { font-size:13px; }
.cx-note { grid-column:1 / -1; text-align:center; font-size:11px; color:#9e9087; }
.cx-overlay { position:fixed; inset:0; z-index:1000; background:rgba(28,26,23,.45); display:flex; align-items:center; justify-content:center; padding:16px; }
.cx-modal { background:#fff; border-radius:12px; width:100%; max-width:600px; max-height:88vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,.25); }
.cx-head { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 14px; color:#fff; }
.cx-close { background:none; border:none; color:#fff; font-size:22px; line-height:1; cursor:pointer; padding:0 2px; }
.cx-groups { display:flex; flex-wrap:wrap; gap:6px; padding:10px 12px; border-bottom:1px solid #F0E6D8; }
.cx-chip { border:1.5px solid #E8D9C4; background:#fff; border-radius:14px; padding:4px 10px; font:inherit; font-size:11px; font-weight:700; color:#1C1A17; cursor:pointer; text-align:left; }
.cx-chip span { color:#7A6F65; font-weight:600; }
.cx-chip.active { border-color:#7A4610; background:#7A4610; color:#fff; }
.cx-chip.active span { color:#f5e6d3; }
.cx-buckets { padding:6px 14px 8px; border-bottom:1px solid #F0E6D8; font-size:11px; color:#7A6F65; display:flex; flex-wrap:wrap; gap:4px 14px; }
.cx-buckets b { color:#1C1A17; }
.cx-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.cx-tbl th { position:sticky; top:0; background:#FBF5EC; color:#7A6F65; font-size:10px; text-transform:uppercase; letter-spacing:.5px; text-align:left; padding:7px 10px; }
.cx-tbl td { padding:7px 10px; border-bottom:1px solid #F0E6D8; vertical-align:top; }
.cx-tbl .num { text-align:right; white-space:nowrap; }
.cx-meta { font-size:11px; color:#7A6F65; margin-top:1px; }
.cx-tag { display:inline-block; font-size:10px; font-weight:700; border-radius:8px; padding:0 6px; margin-left:4px; background:#fef3e2; color:#7A4610; }
.cx-tag.warn { background:#fdecea; color:#c0392b; }
.cx-ord { font-weight:700; color:#7A4610; background:none; border:none; padding:0; cursor:pointer; text-decoration:underline dotted; text-underline-offset:3px; font:inherit; font-size:12px; }
.cx-empty { padding:20px; text-align:center; color:#9e9087; font-size:13px; }
`;

/**
 * Cash in and Expenses for a date range (inclusive, YYYY-MM-DD), from the
 * Accounting-Entry sheet. Each figure opens a breakdown: totals per payment
 * method / expense category, then every entry.
 */
export default function CashExpenseCards({ from, to, periodLabel }: { from: string; to: string; periodLabel: string }) {
  const [data, setData] = useState<AccountingResponse | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<SideKey | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/accounting?from=${from}&to=${to}`)
      .then(r => r.json())
      .then((d: AccountingResponse & { error?: string }) => {
        if (!live) return;
        if (d.error) throw new Error(d.error);
        setData(d);
        setError('');
      })
      .catch((e: Error) => { if (live) { setData(null); setError(e.message); } });
    return () => { live = false; };
  }, [from, to]);

  const card = (key: SideKey) => {
    const side = data?.[key];
    const s = SIDES[key];
    return (
      <button className="cx-card" disabled={!side?.count} onClick={() => setOpen(key)}>
        <div className="cx-lbl">{s.title}</div>
        <div className="cx-val" style={{ color: s.color }}>{side ? fmt(side.total) : '…'}</div>
        <div className="cx-sub">{side ? `${side.count} entr${side.count === 1 ? 'y' : 'ies'}` : 'loading'}</div>
      </button>
    );
  };

  const net = data ? data.cashIn.total - data.expenses.total : 0;

  return (
    <>
      <style>{STYLES}</style>
      <div className="cx-row">
        {error ? (
          <div className="cx-note" style={{ color: '#b0341e' }}>Cash in / expenses unavailable — {error}</div>
        ) : (
          <>
            {card('cashIn')}
            {card('expenses')}
            {data && (
              <div className="cx-net">
                Net cash: <b style={{ color: net >= 0 ? '#1e8449' : '#c0392b' }}>{net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}</b> · from the accounting sheet
              </div>
            )}
          </>
        )}
      </div>
      {open && data && (
        <Breakdown side={data[open]} sideKey={open} periodLabel={periodLabel} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function Breakdown({ side, sideKey, periodLabel, onClose }: {
  side: AccountingSide; sideKey: SideKey; periodLabel: string; onClose: () => void;
}) {
  const s = SIDES[sideKey];
  const [group, setGroup] = useState<string | null>(null);
  const [order, setOrder] = useState<PipelineOrder | null>(null);
  const [orderState, setOrderState] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !order) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, order]);

  const entries = group ? side.entries.filter(e => e.group === group) : side.entries;
  const sel = group ? side.groups.find(g => g.name === group) : null;

  function openOrder(num: string) {
    setOrderState('loading');
    fetch(`/api/orders/${encodeURIComponent(num)}`)
      .then(r => r.json())
      .then((o: PipelineOrder & { error?: string }) => {
        if (o.error) throw new Error(o.error);
        setOrder(o);
        setOrderState('idle');
      })
      .catch(() => setOrderState('error'));
  }

  return (
    <div className="cx-overlay" onClick={onClose}>
      <div className="cx-modal" onClick={e => e.stopPropagation()}>
        <div className="cx-head" style={{ background: s.color }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{s.title} · {periodLabel}</div>
            <div style={{ fontSize: 11, opacity: .9 }}>{fmt(side.total)} EGP · {side.count} entries</div>
          </div>
          <button className="cx-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="cx-groups">
          <button className={`cx-chip${group === null ? ' active' : ''}`} onClick={() => setGroup(null)}>
            All <span>{fmt(side.total)}</span>
          </button>
          {side.groups.map(g => (
            <button key={g.name} className={`cx-chip${group === g.name ? ' active' : ''}`} onClick={() => setGroup(g.name)}>
              {g.name} <span>{fmt(g.total)} · {side.total ? Math.round(g.total / side.total * 100) : 0}%</span>
            </button>
          ))}
        </div>

        {sel?.buckets && sel.buckets.length > 1 && (
          <div className="cx-buckets">
            {sel.buckets.map(b => <span key={b.name}>{b.name}: <b>{fmt(b.total)}</b></span>)}
          </div>
        )}

        <div style={{ overflowY: 'auto' }}>
          {entries.length === 0 ? <div className="cx-empty">No entries.</div> : (
            <table className="cx-tbl">
              <thead><tr><th>Date</th><th>Details</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={`${e.tab}-${e.ref || i}-${i}`}>
                    <td style={{ whiteSpace: 'nowrap' }}>{dayLabel(e.date)}</td>
                    <td>
                      <div>
                        {e.order && /^\d+$/.test(e.order) && (
                          <><button className="cx-ord" onClick={() => openOrder(e.order)}>{e.order}</button>{' '}</>
                        )}
                        {e.order && e.description.startsWith(e.order) ? e.description.slice(e.order.length).trim() : e.description || '—'}
                        {!e.confirmed && <span className="cx-tag warn">unconfirmed</span>}
                      </div>
                      <div className="cx-meta">
                        {[sideKey === 'expenses' ? e.bucket : e.method, e.person, sideKey === 'expenses' ? e.tab : ''].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>{fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {order && (
        <div onClick={e => e.stopPropagation()}>
          <OrderDetailSheet order={order} onBack={() => setOrder(null)} onClose={() => { setOrder(null); onClose(); }} />
        </div>
      )}
      {orderState !== 'idle' && (
        <div className="cx-overlay" style={{ zIndex: 1050 }} onClick={e => { e.stopPropagation(); setOrderState('idle'); }}>
          <div className="cx-modal" style={{ padding: 20, textAlign: 'center', fontSize: 13, color: orderState === 'error' ? '#b0341e' : '#7A6F65' }}>
            {orderState === 'loading' ? 'Loading order…' : 'Couldn’t load that order.'}
          </div>
        </div>
      )}
    </div>
  );
}
