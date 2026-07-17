'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCsToast, fmtDateTime } from './csShared';

interface Flag {
  id: string;
  product_id: string;
  product_name: string | null;
  issue_summary: string;
  severity: string;
  status: string;
  created_at: string;
}

const SEVERITIES = ['low', 'medium', 'high'];
const STATUSES = ['open', 'reviewed', 'resolved'];

// Recurring-defect tagging, surfaced here for management review — separate
// from a single post-delivery issue, this is the rep saying "this keeps
// happening with this product."
export default function IssueFlagsTab() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');
  const { toastMsg, toastType, showToast } = useCsToast();

  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/cs/issue-flags')
      .then(r => r.json())
      .then(data => { setFlags(Array.isArray(data) ? data : []); setLoadState('done'); })
      .catch(() => setLoadState('error'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!productId.trim() || !summary.trim() || saving) return;
    setSaving(true);
    showToast('Saving…', 'saving');
    const res = await fetch('/api/cs/issue-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId.trim(),
        product_name: productName.trim() || undefined,
        issue_summary: summary.trim(),
        severity,
      }),
    });
    setSaving(false);
    if (!res.ok) { showToast('Save failed', 'err'); return; }
    setProductId(''); setProductName(''); setSummary('');
    load();
    showToast('Flagged', 'ok');
  }

  async function setStatus(id: string, status: string) {
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/cs/issue-flags/${id}`, {
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
        <div className="cs-section-title">Flag a recurring product issue</div>
        <div className="cs-form-row">
          <input className="cs-input" placeholder="WC product ID" value={productId} onChange={e => setProductId(e.target.value)} />
          <input className="cs-input" placeholder="Product name (optional)" value={productName} onChange={e => setProductName(e.target.value)} />
          <select className="cs-select" value={severity} onChange={e => setSeverity(e.target.value)}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <textarea className="cs-textarea" placeholder="What keeps going wrong?" value={summary} onChange={e => setSummary(e.target.value)} />
        <div>
          <button className="cs-btn" disabled={saving || !productId.trim() || !summary.trim()} onClick={create}>Flag for review</button>
        </div>
      </div>

      {loadState === 'loading' && <div className="cs-state">Loading…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load flags</div>}
      {loadState === 'done' && flags.length === 0 && <div className="cs-state">No product issues flagged.</div>}
      {loadState === 'done' && flags.length > 0 && (
        <div className="cs-list">
          {flags.map(f => (
            <div key={f.id} className={`cs-card${f.severity === 'high' && f.status === 'open' ? ' delayed' : ''}`}>
              <div className="cs-card-top">
                <span className="cs-badge">{f.severity}</span>
                <span className="cs-cust">{f.product_name ?? `Product ${f.product_id}`}</span>
                <span className={`cs-badge${f.status === 'resolved' ? ' ok' : ''}`}>{f.status}</span>
              </div>
              <div className="cs-sub"><span>{f.issue_summary}</span></div>
              <div className="cs-sub"><span>flagged {fmtDateTime(f.created_at)}</span></div>
              <div className="cs-row-actions">
                {STATUSES.filter(s => s !== f.status).map(s => (
                  <button key={s} className="cs-btn ghost" onClick={() => setStatus(f.id, s)}>Mark {s}</button>
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
