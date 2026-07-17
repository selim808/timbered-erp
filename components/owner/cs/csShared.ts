import { useCallback, useEffect, useRef, useState } from 'react';
import type { CsOrder } from '@/app/api/cs/orders/route';

/** Shared fetch for the "processing" orders view (Call Queue + Delay Flags read the same list). */
export function useCsOrders() {
  const [orders, setOrders] = useState<CsOrder[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  const reload = useCallback(() => {
    setLoadState(prev => prev === 'done' ? 'done' : 'loading');
    fetch('/api/cs/orders')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error(data?.error ?? 'Failed to load');
        setOrders(data);
        setLoadState('done');
      })
      .catch((e: Error) => { setErrMsg(e.message); setLoadState('error'); });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { orders, loadState, errMsg, reload };
}

export function useCsToast() {
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'saving' | 'ok' | 'err'>('ok');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: 'saving' | 'ok' | 'err') {
    setToastMsg(msg);
    setToastType(type);
    if (timer.current) clearTimeout(timer.current);
    if (type !== 'saving') timer.current = setTimeout(() => setToastMsg(''), 2200);
  }

  return { toastMsg, toastType, showToast };
}

export const CS_STATUSES = [
  'new', 'called', 'confirmed', 'deposit_pending', 'deposit_paid',
  'in_production', 'delayed', 'delivered', 'review_requested', 'closed',
] as const;

export type CsStatus = typeof CS_STATUSES[number] | 'cancelled';

export const CS_STATUS_LABEL: Record<string, string> = {
  new: 'New',
  called: 'Called',
  confirmed: 'Confirmed',
  deposit_pending: 'Deposit Pending',
  deposit_paid: 'Deposit Paid',
  in_production: 'In Production',
  delayed: 'Delayed',
  delivered: 'Delivered',
  review_requested: 'Review Requested',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// Shared styles for every CS module tab — rendered once by the page shell
// (all tab classnames are prefixed "cs-") so panels don't repeat ~150 lines
// of near-identical CSS each, matching the .cr-*/.co-*/.pg-* convention
// already used by cancellation-reasons/phases/pipeline-orders pages.
export const CS_CSS = `
.cs-tabbar { background:#7A4610; padding:0 20px; height:52px; display:flex; align-items:center; gap:4px; position:sticky; top:64px; z-index:100; overflow-x:auto; }
.cs-tab { background:transparent; border:none; color:rgba(255,255,255,.65); font-size:12px; font-weight:700; padding:8px 12px; border-radius:7px; cursor:pointer; white-space:nowrap; }
.cs-tab:hover { color:#fff; background:rgba(255,255,255,.1); }
.cs-tab.active { color:#fff; background:rgba(255,255,255,.2); }
.cs-body { padding:20px; max-width:760px; margin:0 auto; }
.cs-state { background:#fff; border-radius:10px; padding:32px; text-align:center; color:#999; font-size:14px; border:1px solid #e8ddd4; }
.cs-list { display:flex; flex-direction:column; gap:10px; }
.cs-card { background:#fff; border:1px solid #e8ddd4; border-radius:10px; padding:12px 14px; }
.cs-card.delayed { border-color:#f1a9a0; background:#fdf7f6; }
.cs-card-top { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.cs-num { font-weight:700; color:#7A4610; font-size:13px; }
.cs-cust { font-size:13px; color:#333; flex:1; min-width:0; }
.cs-total { font-size:12px; font-weight:700; color:#7A4610; }
.cs-badge { font-size:10px; font-weight:700; padding:2px 9px; border-radius:20px; background:#f5f0eb; color:#7A4610; white-space:nowrap; }
.cs-badge.warn { background:#fdecea; color:#c0392b; }
.cs-badge.ok { background:#d1fae5; color:#065f46; }
.cs-sub { font-size:12px; color:#888; margin-top:6px; display:flex; gap:12px; flex-wrap:wrap; }
.cs-items { margin-top:6px; display:flex; flex-wrap:wrap; gap:6px; }
.cs-item { font-size:11px; color:#777; background:#f6f1ea; border-radius:6px; padding:2px 7px; }
.cs-item.delayed { background:#fdecea; color:#c0392b; }
.cs-contact { display:flex; gap:8px; margin-top:8px; }
.cs-contact-btn { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; border-radius:20px; padding:4px 12px; text-decoration:none; border:none; cursor:pointer; flex-shrink:0; }
.cs-contact-btn.wa { background:#25D366; color:#fff; }
.cs-contact-btn.call { background:#f0e8e0; color:#7A4610; }
.cs-row-actions { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; align-items:center; }
.cs-select { border:1px solid #e0d8d0; border-radius:6px; padding:6px 8px; font-size:12px; color:#333; background:#fff; cursor:pointer; }
.cs-input { border:1px solid #e0d8d0; border-radius:6px; padding:6px 9px; font-size:12px; color:#333; background:#fff; outline:none; }
.cs-input:focus { border-color:#7A4610; }
.cs-textarea { border:1px solid #e0d8d0; border-radius:6px; padding:7px 10px; font-size:12px; color:#333; background:#fff; outline:none; width:100%; resize:vertical; min-height:56px; font-family:inherit; }
.cs-textarea:focus { border-color:#7A4610; }
.cs-btn { background:#7A4610; color:#fff; border:none; border-radius:7px; padding:6px 14px; font-size:12px; font-weight:700; cursor:pointer; }
.cs-btn:hover { background:#5e340c; }
.cs-btn:disabled { opacity:.5; cursor:not-allowed; }
.cs-btn.ghost { background:#f5f0eb; color:#7A4610; }
.cs-btn.ghost:hover { background:#ede5dc; }
.cs-btn.danger { background:#c0392b; }
.cs-btn.danger:hover { background:#a53125; }
.cs-check { display:inline-flex; align-items:center; margin-top:8px; }
.cs-notes { margin-top:8px; border-top:1px solid #f0e8e0; padding-top:8px; }
.cs-note { font-size:11px; color:#777; padding:3px 0; }
.cs-note b { color:#333; }
.cs-form { background:#fff; border:1px solid #e8ddd4; border-radius:10px; padding:14px; display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
.cs-form-row { display:flex; gap:8px; flex-wrap:wrap; }
.cs-form-row .cs-input, .cs-form-row .cs-select { flex:1; min-width:140px; }
.cs-section-title { font-size:13px; font-weight:700; color:#7A4610; margin-bottom:10px; }
.cs-toast { position:fixed; bottom:20px; right:20px; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; z-index:500; pointer-events:none; }
.cs-toast-saving { background:#fef3c7; color:#92400e; }
.cs-toast-ok  { background:#d1fae5; color:#065f46; }
.cs-toast-err { background:#fee2e2; color:#991b1b; }
.cs-empty { padding:14px; font-size:12px; color:#bbb; font-style:italic; }
.cs-faq-card { background:#fff; border:1px solid #e8ddd4; border-radius:10px; overflow:hidden; }
.cs-faq-row { padding:11px 14px; border-bottom:1px solid #f0e8e0; }
.cs-faq-row:last-of-type { border-bottom:none; }
.cs-faq-q { font-weight:700; font-size:13px; color:#333; }
.cs-faq-a { font-size:12px; color:#666; margin-top:3px; white-space:pre-wrap; }
.cs-faq-cat { font-size:10px; font-weight:700; color:#7A4610; background:#f5f0eb; border-radius:20px; padding:2px 8px; margin-right:6px; }
.cs-faq-actions { display:flex; gap:10px; margin-top:6px; }
.cs-faq-actions button { background:none; border:none; cursor:pointer; font-size:11px; font-weight:700; padding:0; }
.cs-faq-actions .edit { color:#7A4610; }
.cs-faq-actions .del { color:#ef4444; }
`;
