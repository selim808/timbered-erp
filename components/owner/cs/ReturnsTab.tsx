'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCsToast, fmtDateTime } from './csShared';

interface ReturnRow {
  id: string;
  wc_order_id: string;
  type: string;
  reason: string;
  status: string;
  note: string | null;
  created_at: string;
}

const TYPES = ['return', 'exchange'];
const STATUSES = ['requested', 'approved', 'in_transit', 'received', 'refunded', 'exchanged', 'rejected'];

export default function ReturnsTab() {
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');
  const { toastMsg, toastType, showToast } = useCsToast();

  const [wcOrderId, setWcOrderId] = useState('');
  const [type, setType] = useState(TYPES[0]);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/cs/returns')
      .then(r => r.json())
      .then(data => { setRows(Array.isArray(data) ? data : []); setLoadState('done'); })
      .catch(() => setLoadState('error'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!wcOrderId.trim() || !reason.trim() || saving) return;
    setSaving(true);
    showToast('Saving…', 'saving');
    const res = await fetch('/api/cs/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wc_order_id: wcOrderId.trim(), type, reason: reason.trim() }),
    });
    setSaving(false);
    if (!res.ok) { showToast('Save failed', 'err'); return; }
    setWcOrderId(''); setReason('');
    load();
    showToast('Logged', 'ok');
  }

  async function setStatus(id: string, status: string) {
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/cs/returns/${id}`, {
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
        <div className="cs-section-title">Log a return / exchange request</div>
        <div className="cs-form-row">
          <input className="cs-input" placeholder="WC order # or ID" value={wcOrderId} onChange={e => setWcOrderId(e.target.value)} />
          <select className="cs-select" value={type} onChange={e => setType(e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <textarea className="cs-textarea" placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)} />
        <div>
          <button className="cs-btn" disabled={saving || !wcOrderId.trim() || !reason.trim()} onClick={create}>Log request</button>
        </div>
      </div>

      {loadState === 'loading' && <div className="cs-state">Loading…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load returns</div>}
      {loadState === 'done' && rows.length === 0 && <div className="cs-state">No return/exchange requests.</div>}
      {loadState === 'done' && rows.length > 0 && (
        <div className="cs-list">
          {rows.map(r => (
            <div key={r.id} className="cs-card">
              <div className="cs-card-top">
                <span className="cs-badge">{r.type}</span>
                <span className="cs-num">Order {r.wc_order_id}</span>
                <span className={`cs-badge${['refunded', 'exchanged'].includes(r.status) ? ' ok' : ''}`}>{r.status.replace('_', ' ')}</span>
              </div>
              <div className="cs-sub"><span>{r.reason}</span></div>
              <div className="cs-sub"><span>logged {fmtDateTime(r.created_at)}</span></div>
              <div className="cs-row-actions">
                {STATUSES.filter(s => s !== r.status).map(s => (
                  <button key={s} className="cs-btn ghost" onClick={() => setStatus(r.id, s)}>{s.replace('_', ' ')}</button>
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
