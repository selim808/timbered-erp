'use client';

import { useState } from 'react';
import type { CsOrder } from '@/app/api/cs/orders/route';
import { fmtPrice, waPhone } from '@/components/shared/PipelineOrderCard';
import { CS_STATUSES, CS_STATUS_LABEL } from './csShared';

interface Props {
  order: CsOrder;
  mode: 'queue' | 'delay';
  onChanged: () => void;
}

// Shared order card used by both Call Queue and Delay Flags — they read the
// same /api/cs/orders list, just filtered differently, so they share one row.
export default function CsOrderRow({ order: o, mode, onChanged }: Props) {
  const [status, setStatus] = useState(o.csStatus);
  const [note, setNote] = useState('');
  const [depositRequired, setDepositRequired] = useState(o.depositRequired);
  const [depositAmount, setDepositAmount] = useState(o.depositAmount != null ? String(o.depositAmount) : '');
  const [upsellOffered, setUpsellOffered] = useState(o.upsellOffered);
  const [upsellAccepted, setUpsellAccepted] = useState(!!o.upsellAccepted);
  const [busy, setBusy] = useState(false);

  const wp = o.customerPhone ? waPhone(o.customerPhone) : '';
  const delayedItems = o.lineItems.filter(li => li.isDelayed);

  async function updateStatus(toStatus: string, autoNote?: string) {
    setBusy(true);
    await fetch(`/api/cs/orders/${o.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_status: toStatus, note: (autoNote ?? note).trim() || undefined }),
    });
    setNote('');
    setBusy(false);
    onChanged();
  }

  async function saveDeposit(markPaid = false) {
    setBusy(true);
    await fetch(`/api/cs/orders/${o.id}/deposit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deposit_required: depositRequired,
        deposit_amount: depositAmount ? Number(depositAmount) : undefined,
        mark_paid: markPaid,
      }),
    });
    setBusy(false);
    onChanged();
  }

  async function saveUpsell() {
    setBusy(true);
    await fetch(`/api/cs/orders/${o.id}/upsell`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upsell_offered: upsellOffered, upsell_accepted: upsellAccepted }),
    });
    setBusy(false);
    onChanged();
  }

  async function markDelivered() {
    setBusy(true);
    await fetch(`/api/cs/orders/${o.id}/delivered`, { method: 'POST' });
    setBusy(false);
    onChanged();
  }

  return (
    <div className={`cs-card${o.isDelayed ? ' delayed' : ''}`}>
      <div className="cs-card-top">
        <span className="cs-badge">{o.daysOpen}d</span>
        <span className="cs-num">{o.number}</span>
        <span className="cs-cust">{o.customerName}</span>
        <span className="cs-total">{fmtPrice(o.total)} EGP</span>
        <span className="cs-badge">{CS_STATUS_LABEL[o.csStatus] ?? o.csStatus}</span>
      </div>

      {wp && (
        <div className="cs-contact">
          <a className="cs-contact-btn wa" href={`https://wa.me/${wp}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="cs-contact-btn call" href={`tel:${o.customerPhone}`}>Call {o.customerPhone}</a>
        </div>
      )}

      <div className="cs-items">
        {o.lineItems.map(li => (
          <span key={li.id} className={`cs-item${li.isDelayed ? ' delayed' : ''}`}>
            {li.quantity}× {li.name} · {li.phase}
            {li.isDelayed && li.daysInPhase != null ? ` (${li.daysInPhase}d, expected ${li.expectedDays}d)` : ''}
          </span>
        ))}
      </div>

      {mode === 'delay' && delayedItems.length > 0 && o.csStatus !== 'delayed' && (
        <div className="cs-row-actions">
          <button
            className="cs-btn danger"
            disabled={busy}
            onClick={() => updateStatus('delayed', 'Customer notified of production delay')}
          >
            Flag delayed &amp; log notification
          </button>
        </div>
      )}

      <div className="cs-row-actions">
        <select className="cs-select" value={status} onChange={e => setStatus(e.target.value)} disabled={busy}>
          {[...CS_STATUSES, 'cancelled'].map(s => <option key={s} value={s}>{CS_STATUS_LABEL[s]}</option>)}
        </select>
        <input
          className="cs-input" placeholder="Note (optional)" value={note}
          onChange={e => setNote(e.target.value)} style={{ flex: 1, minWidth: 140 }}
        />
        <button className="cs-btn" disabled={busy || (status === o.csStatus && !note.trim())} onClick={() => updateStatus(status)}>
          Update status
        </button>
        {!o.deliveredAt && (
          <button className="cs-btn ghost" disabled={busy} onClick={markDelivered}>Mark delivered</button>
        )}
      </div>

      {mode === 'queue' && (
        <>
          <div className="cs-row-actions">
            <label className="cs-check">
              <input type="checkbox" checked={depositRequired} onChange={e => setDepositRequired(e.target.checked)} />
              &nbsp;Deposit required
            </label>
            {depositRequired && (
              <>
                <input
                  className="cs-input" type="number" placeholder="Amount" value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)} style={{ width: 90 }}
                />
                {o.depositPaidAt
                  ? <span className="cs-badge ok">Paid {new Date(o.depositPaidAt).toLocaleDateString('en-GB')}</span>
                  : <button className="cs-btn ghost" disabled={busy} onClick={() => saveDeposit(true)}>Mark paid</button>}
              </>
            )}
            <button className="cs-btn ghost" disabled={busy} onClick={() => saveDeposit(false)}>Save deposit</button>
          </div>

          <div className="cs-row-actions">
            <label className="cs-check">
              <input type="checkbox" checked={upsellOffered} onChange={e => setUpsellOffered(e.target.checked)} />
              &nbsp;Upsell offered
            </label>
            <label className="cs-check">
              <input type="checkbox" checked={upsellAccepted} disabled={!upsellOffered}
                onChange={e => setUpsellAccepted(e.target.checked)} />
              &nbsp;Accepted
            </label>
            <button className="cs-btn ghost" disabled={busy} onClick={saveUpsell}>Save upsell</button>
          </div>
        </>
      )}
    </div>
  );
}
