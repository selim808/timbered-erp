'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCsToast, fmtDateTime } from './csShared';

interface Ticket {
  id: string;
  wc_order_id: string;
  product_id: string | null;
  product_name: string | null;
  issue_type: string;
  description: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

const TICKET_TYPES = ['damage', 'missing_parts', 'defect', 'other'];
const TICKET_STATUSES = ['open', 'in_review', 'resolved'];

// Customer complaints/support tickets raised against an order. Backed by
// cs_post_delivery_issues — one row per reported problem, worked from open →
// in review → resolved.
export default function TicketsTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');
  const [showResolved, setShowResolved] = useState(false);
  const { toastMsg, toastType, showToast } = useCsToast();

  const [wcOrderId, setWcOrderId] = useState('');
  const [productName, setProductName] = useState('');
  const [ticketType, setTicketType] = useState(TICKET_TYPES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/cs/post-delivery-issues')
      .then(r => r.json())
      .then(data => { setTickets(Array.isArray(data) ? data : []); setLoadState('done'); })
      .catch(() => setLoadState('error'));
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(
    () => (showResolved ? tickets : tickets.filter(t => t.status !== 'resolved')),
    [tickets, showResolved],
  );

  async function create() {
    if (!wcOrderId.trim() || !description.trim() || saving) return;
    setSaving(true);
    showToast('Saving…', 'saving');
    const res = await fetch('/api/cs/post-delivery-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wc_order_id: wcOrderId.trim(),
        product_name: productName.trim() || undefined,
        issue_type: ticketType,
        description: description.trim(),
      }),
    });
    setSaving(false);
    if (!res.ok) { showToast('Save failed', 'err'); return; }
    setWcOrderId(''); setProductName(''); setDescription('');
    load();
    showToast('Ticket opened', 'ok');
  }

  async function setStatus(id: string, status: string) {
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/cs/post-delivery-issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { showToast('Save failed', 'err'); return; }
    load();
    showToast('Saved', 'ok');
  }

  return (
    <div>
      <div className="cs-form">
        <div className="cs-section-title">Open a ticket</div>
        <div className="cs-form-row">
          <input className="cs-input" placeholder="WC order # or ID" value={wcOrderId} onChange={e => setWcOrderId(e.target.value)} />
          <input className="cs-input" placeholder="Product (optional)" value={productName} onChange={e => setProductName(e.target.value)} />
          <select className="cs-select" value={ticketType} onChange={e => setTicketType(e.target.value)}>
            {TICKET_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <textarea className="cs-textarea" placeholder="What is the customer reporting?" value={description} onChange={e => setDescription(e.target.value)} />
        <div>
          <button className="cs-btn" disabled={saving || !wcOrderId.trim() || !description.trim()} onClick={create}>Open ticket</button>
        </div>
      </div>

      <label className="cs-check" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} />
        &nbsp;Include resolved tickets
      </label>

      {loadState === 'loading' && <div className="cs-state">Loading…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load tickets</div>}
      {loadState === 'done' && visible.length === 0 && (
        <div className="cs-state">{showResolved ? 'No tickets logged.' : 'No open tickets.'}</div>
      )}
      {loadState === 'done' && visible.length > 0 && (
        <div className="cs-list">
          {visible.map(t => (
            <div key={t.id} className={`cs-card${t.status !== 'resolved' ? ' delayed' : ''}`}>
              <div className="cs-card-top">
                <span className="cs-badge">{t.issue_type.replace('_', ' ')}</span>
                <span className="cs-num">Order {t.wc_order_id}</span>
                {t.product_name && <span className="cs-cust">{t.product_name}</span>}
                <span className={`cs-badge${t.status === 'resolved' ? ' ok' : ''}`}>{t.status.replace('_', ' ')}</span>
              </div>
              <div className="cs-sub"><span>{t.description}</span></div>
              <div className="cs-sub">
                <span>opened {fmtDateTime(t.created_at)}</span>
                {t.resolved_at && <span>resolved {fmtDateTime(t.resolved_at)}</span>}
              </div>
              <div className="cs-row-actions">
                {TICKET_STATUSES.filter(s => s !== t.status).map(s => (
                  <button key={s} className="cs-btn ghost" onClick={() => setStatus(t.id, s)}>Mark {s.replace('_', ' ')}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {toastMsg && <div className={`cs-toast cs-toast-${toastType}`}>{toastMsg}</div>}
    </div>
  );
}
