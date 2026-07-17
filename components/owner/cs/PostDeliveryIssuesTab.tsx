'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCsToast, fmtDateTime } from './csShared';

interface Issue {
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

const ISSUE_TYPES = ['damage', 'missing_parts', 'defect', 'other'];
const ISSUE_STATUSES = ['open', 'in_review', 'resolved'];

export default function PostDeliveryIssuesTab() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');
  const { toastMsg, toastType, showToast } = useCsToast();

  const [wcOrderId, setWcOrderId] = useState('');
  const [productName, setProductName] = useState('');
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/cs/post-delivery-issues')
      .then(r => r.json())
      .then(data => { setIssues(Array.isArray(data) ? data : []); setLoadState('done'); })
      .catch(() => setLoadState('error'));
  }, []);

  useEffect(() => { load(); }, [load]);

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
        issue_type: issueType,
        description: description.trim(),
      }),
    });
    setSaving(false);
    if (!res.ok) { showToast('Save failed', 'err'); return; }
    setWcOrderId(''); setProductName(''); setDescription('');
    load();
    showToast('Logged', 'ok');
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
        <div className="cs-section-title">Log a post-delivery issue</div>
        <div className="cs-form-row">
          <input className="cs-input" placeholder="WC order # or ID" value={wcOrderId} onChange={e => setWcOrderId(e.target.value)} />
          <input className="cs-input" placeholder="Product (optional)" value={productName} onChange={e => setProductName(e.target.value)} />
          <select className="cs-select" value={issueType} onChange={e => setIssueType(e.target.value)}>
            {ISSUE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        <textarea className="cs-textarea" placeholder="What's wrong?" value={description} onChange={e => setDescription(e.target.value)} />
        <div>
          <button className="cs-btn" disabled={saving || !wcOrderId.trim() || !description.trim()} onClick={create}>Log issue</button>
        </div>
      </div>

      {loadState === 'loading' && <div className="cs-state">Loading…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load issues</div>}
      {loadState === 'done' && issues.length === 0 && <div className="cs-state">No post-delivery issues logged.</div>}
      {loadState === 'done' && issues.length > 0 && (
        <div className="cs-list">
          {issues.map(i => (
            <div key={i.id} className={`cs-card${i.status !== 'resolved' ? ' delayed' : ''}`}>
              <div className="cs-card-top">
                <span className="cs-badge">{i.issue_type.replace('_', ' ')}</span>
                <span className="cs-num">Order {i.wc_order_id}</span>
                {i.product_name && <span className="cs-cust">{i.product_name}</span>}
                <span className={`cs-badge${i.status === 'resolved' ? ' ok' : ''}`}>{i.status.replace('_', ' ')}</span>
              </div>
              <div className="cs-sub"><span>{i.description}</span></div>
              <div className="cs-sub">
                <span>logged {fmtDateTime(i.created_at)}</span>
                {i.resolved_at && <span>resolved {fmtDateTime(i.resolved_at)}</span>}
              </div>
              <div className="cs-row-actions">
                {ISSUE_STATUSES.filter(s => s !== i.status).map(s => (
                  <button key={s} className="cs-btn ghost" onClick={() => setStatus(i.id, s)}>Mark {s.replace('_', ' ')}</button>
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
