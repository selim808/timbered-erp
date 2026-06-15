'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CancelledOrder } from '@/app/api/pipeline/orders/cancelled/route';
import { fmtPrice } from '@/components/shared/PipelineOrderCard';

function fmtDateTime(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function orderQty(o: CancelledOrder) {
  return o.lineItems.reduce((sum, li) => sum + (li.quantity ?? 0), 0);
}

export default function CancelledOrdersTab() {
  const [orders, setOrders] = useState<CancelledOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reactivating, setReactivating] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback((p: number) => {
    setLoading(true);
    setError('');
    setSelected(new Set());
    fetch(`/api/pipeline/orders/cancelled?page=${p}`)
      .then(r => r.json())
      .then(data => {
        if (data?.error) throw new Error(data.error);
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
        setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev =>
      prev.size === orders.length ? new Set() : new Set(orders.map(o => o.id))
    );
  }

  async function reactivate() {
    if (selected.size === 0 || reactivating) return;
    const ids = Array.from(selected);
    setReactivating(true);
    const failed: number[] = [];
    for (const id of ids) {
      const res = await fetch(`/api/pipeline/orders/${id}/reactivate`, { method: 'POST' });
      if (!res.ok) failed.push(id);
    }
    const succeeded = new Set(ids.filter(id => !failed.includes(id)));
    setOrders(prev => prev.filter(o => !succeeded.has(o.id)));
    setSelected(new Set());
    setReactivating(false);
    if (failed.length) showToast(`${succeeded.size} reactivated, ${failed.length} failed`);
    else showToast(`${ids.length} order(s) back to processing`);
  }

  return (
    <div className="co-wrap">
      <div className="co-head">
        <span className="co-title">Cancelled orders</span>
        <span className="co-sub">{total} total · page {page} of {totalPages}</span>
      </div>

      {selected.size > 0 && (
        <div className="co-sel-bar">
          <span className="co-sel-msg">{selected.size} selected</span>
          <button className="co-sel-do" disabled={reactivating} onClick={reactivate}>
            {reactivating ? 'Processing…' : '↻ Make Processing'}
          </button>
          <button className="co-sel-x" onClick={() => setSelected(new Set())}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="co-state">Loading cancelled orders…</div>
      ) : error ? (
        <div className="co-state" style={{ color: '#e74c3c' }}>{error}</div>
      ) : orders.length === 0 ? (
        <div className="co-state">No cancelled orders</div>
      ) : (
        <>
          <div className="co-selall">
            <label className="co-check">
              <input type="checkbox" checked={selected.size === orders.length} onChange={toggleAll} />
              <span>Select all on this page</span>
            </label>
          </div>

          <div className="co-list">
            {orders.map(o => (
              <div key={o.id} className={`co-row${selected.has(o.id) ? ' sel' : ''}`}>
                <input
                  type="checkbox"
                  className="co-row-check"
                  checked={selected.has(o.id)}
                  onChange={() => toggle(o.id)}
                />
                <div className="co-row-main">
                  <div className="co-row-top">
                    {o.reason && <span className="co-reason">{o.reason}</span>}
                    <span className="co-num">#{o.number}</span>
                    <span className="co-cust">{o.customerName || '—'}</span>
                  </div>
                  <div className="co-row-bot">
                    <span>{orderQty(o)} pcs · {fmtPrice(o.total)} EGP</span>
                    <span className="co-date">cancelled {fmtDateTime(o.dateCancelled)}</span>
                  </div>
                  <div className="co-items">
                    {o.lineItems.map(li => (
                      <span key={li.id} className="co-item">{li.quantity}× {li.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="co-pager">
            <button disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </>
      )}

      {toast && <div className="co-toast">{toast}</div>}

      <style jsx>{`
        .co-wrap { padding: 4px 0 40px; }
        .co-head { display: flex; align-items: baseline; gap: 12px; margin: 6px 2px 12px; }
        .co-title { font-size: 15px; font-weight: 700; color: #c0392b; }
        .co-sub { font-size: 12px; color: #999; }
        .co-state { background: #fff; border: 1px solid #e8ddd4; border-radius: 10px; padding: 32px; text-align: center; color: #999; font-size: 14px; }
        .co-sel-bar { display: flex; align-items: center; gap: 12px; background: #fdecea; border: 1px solid #f1a9a0; border-radius: 10px; padding: 8px 14px; margin-bottom: 12px; }
        .co-sel-msg { font-size: 13px; font-weight: 700; color: #c0392b; flex: 1; }
        .co-sel-do { background: #2e7d32; color: #fff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .co-sel-do:disabled { opacity: .6; cursor: default; }
        .co-sel-x { background: none; border: none; cursor: pointer; color: #c0392b; font-size: 14px; }
        .co-selall { margin: 0 2px 8px; }
        .co-check { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: #777; cursor: pointer; }
        .co-list { display: flex; flex-direction: column; gap: 8px; }
        .co-row { display: flex; gap: 12px; background: #fff; border: 1px solid #e8ddd4; border-radius: 10px; padding: 12px 14px; }
        .co-row.sel { border-color: #c0392b; background: #fdf7f6; }
        .co-row-check { margin-top: 3px; flex-shrink: 0; }
        .co-row-main { flex: 1; min-width: 0; }
        .co-row-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .co-reason { background: #c0392b; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 20px; }
        .co-num { font-weight: 700; color: #7A4610; font-size: 13px; }
        .co-cust { font-size: 13px; color: #333; }
        .co-row-bot { display: flex; gap: 14px; margin-top: 4px; font-size: 12px; color: #888; }
        .co-date { color: #aaa; }
        .co-items { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; }
        .co-item { font-size: 11px; color: #777; background: #f6f1ea; border-radius: 6px; padding: 2px 7px; }
        .co-pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 18px; font-size: 13px; color: #777; }
        .co-pager button { background: #fff; border: 1px solid #e0d8d0; border-radius: 8px; padding: 6px 14px; font-size: 13px; font-weight: 600; color: #7A4610; cursor: pointer; }
        .co-pager button:disabled { opacity: .4; cursor: default; }
        .co-toast { position: fixed; bottom: 20px; right: 20px; background: #333; color: #fff; padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; z-index: 500; }
      `}</style>
    </div>
  );
}
