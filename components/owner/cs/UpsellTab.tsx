'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCsToast } from './csShared';

interface Upsell {
  id: string;
  product_id: string;
  suggestion: string;
  note: string | null;
}

// Per-SKU add-on suggestions a CS rep can offer during the confirmation
// call. Read via GET /api/cs/upsell?product_id= from the Call Queue in a
// future pass; managed here as a flat list for now.
export default function UpsellTab() {
  const [rows, setRows] = useState<Upsell[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');
  const { toastMsg, toastType, showToast } = useCsToast();

  const [productId, setProductId] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch('/api/cs/upsell')
      .then(r => r.json())
      .then(data => { setRows(Array.isArray(data) ? data : []); setLoadState('done'); })
      .catch(() => setLoadState('error'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!productId.trim() || !suggestion.trim() || saving) return;
    setSaving(true);
    showToast('Saving…', 'saving');
    const res = await fetch('/api/cs/upsell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId.trim(), suggestion: suggestion.trim() }),
    });
    setSaving(false);
    if (!res.ok) { showToast('Save failed', 'err'); return; }
    setProductId(''); setSuggestion('');
    load();
    showToast('Added', 'ok');
  }

  async function remove(id: string) {
    if (!confirm('Remove this suggestion?')) return;
    setRows(prev => prev.filter(r => r.id !== id));
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/cs/upsell/${id}`, { method: 'DELETE' });
    showToast(res.ok ? 'Removed' : 'Delete failed', res.ok ? 'ok' : 'err');
  }

  return (
    <div>
      <div className="cs-form">
        <div className="cs-section-title">Add an upsell suggestion</div>
        <div className="cs-form-row">
          <input className="cs-input" placeholder="WC product ID" value={productId} onChange={e => setProductId(e.target.value)} />
          <input className="cs-input" placeholder="Suggested add-on" value={suggestion} onChange={e => setSuggestion(e.target.value)} style={{ flex: 2 }} />
        </div>
        <div>
          <button className="cs-btn" disabled={saving || !productId.trim() || !suggestion.trim()} onClick={add}>Add suggestion</button>
        </div>
      </div>

      {loadState === 'loading' && <div className="cs-state">Loading…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load suggestions</div>}
      {loadState === 'done' && rows.length === 0 && <div className="cs-empty">No upsell suggestions yet.</div>}
      {loadState === 'done' && rows.length > 0 && (
        <div className="cs-list">
          {rows.map(r => (
            <div key={r.id} className="cs-card">
              <div className="cs-card-top">
                <span className="cs-badge">Product {r.product_id}</span>
                <span className="cs-cust">{r.suggestion}</span>
                <button className="cs-btn ghost" onClick={() => remove(r.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toastMsg && <div className={`cs-toast cs-toast-${toastType}`}>{toastMsg}</div>}
    </div>
  );
}
