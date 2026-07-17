'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCsToast, fmtDateTime } from './csShared';

interface Followup {
  id: string;
  wc_order_id: string;
  due_at: string;
  contacted_at: string | null;
  outcome: string;
  rating: number | null;
  note: string | null;
}

const OUTCOMES = ['left_review', 'declined', 'no_response'];

// Surfaces orders due for a satisfaction/review follow-up call — the row is
// created automatically when a CS rep marks an order delivered.
export default function ReviewFollowupTab() {
  const [rows, setRows] = useState<Followup[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');
  const [showAll, setShowAll] = useState(false);
  const { toastMsg, toastType, showToast } = useCsToast();

  const load = useCallback((dueOnly: boolean) => {
    fetch(`/api/cs/review-followups${dueOnly ? '?due=1' : ''}`)
      .then(r => r.json())
      .then(data => { setRows(Array.isArray(data) ? data : []); setLoadState('done'); })
      .catch(() => setLoadState('error'));
  }, []);

  useEffect(() => { load(!showAll); }, [showAll, load]);

  async function record(id: string, outcome: string) {
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/cs/review-followups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    });
    if (!res.ok) { showToast('Save failed', 'err'); return; }
    load(!showAll);
    showToast('Saved', 'ok');
  }

  return (
    <div>
      <label className="cs-check" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
        &nbsp;Show all (including not-yet-due and already contacted)
      </label>

      {loadState === 'loading' && <div className="cs-state">Loading…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load follow-ups</div>}
      {loadState === 'done' && rows.length === 0 && <div className="cs-state">Nothing due for follow-up.</div>}
      {loadState === 'done' && rows.length > 0 && (
        <div className="cs-list">
          {rows.map(f => (
            <div key={f.id} className="cs-card">
              <div className="cs-card-top">
                <span className="cs-num">Order {f.wc_order_id}</span>
                <span className={`cs-badge${f.outcome !== 'pending' ? ' ok' : ''}`}>{f.outcome.replace('_', ' ')}</span>
              </div>
              <div className="cs-sub">
                <span>due {fmtDateTime(f.due_at)}</span>
                {f.contacted_at && <span>contacted {fmtDateTime(f.contacted_at)}</span>}
              </div>
              {f.outcome === 'pending' && (
                <div className="cs-row-actions">
                  {OUTCOMES.map(o => (
                    <button key={o} className="cs-btn ghost" onClick={() => record(f.id, o)}>{o.replace('_', ' ')}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toastMsg && <div className={`cs-toast cs-toast-${toastType}`}>{toastMsg}</div>}
    </div>
  );
}
