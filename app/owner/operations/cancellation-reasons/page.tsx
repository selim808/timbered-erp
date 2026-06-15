'use client';

import { useEffect, useRef, useState } from 'react';

interface Reason {
  id: string;
  label: string;
  sort_order: number;
}

const CSS = `
.cr-bar { background:#7A4610; color:#fff; padding:0 20px; height:52px; display:flex; align-items:center; gap:12px; position:sticky; top:64px; z-index:100; }
.cr-bar-title { font-size:16px; font-weight:700; flex:1; }
.cr-bar-sub { font-size:12px; opacity:.6; }
.cr-body { padding:20px; max-width:560px; }
.cr-state { background:#fff; border-radius:10px; padding:32px; text-align:center; color:#999; font-size:14px; border:1px solid #e8ddd4; }
.cr-card { background:#fff; border:1px solid #e8ddd4; border-radius:10px; overflow:hidden; }
.cr-row { display:flex; align-items:center; gap:10px; padding:11px 14px; font-size:13px; border-bottom:1px solid #f0e8e0; transition:background .15s; }
.cr-row:last-of-type { border-bottom:none; }
.cr-row:hover { background:#faf7f4; }
.cr-row:hover .cr-del-btn, .cr-row:hover .cr-drag { opacity:1; }
.cr-row.cr-dragging { opacity:.35; background:#f5f0eb; }
.cr-row.cr-over { border-top:2px solid #7A4610; background:#fdf9f6; }
.cr-drag { width:12px; height:18px; flex-shrink:0; cursor:grab; background-image:radial-gradient(circle,#bbb 1.5px,transparent 1.5px); background-size:5px 6px; background-repeat:repeat; opacity:.55; transition:opacity .15s; }
.cr-drag:active { cursor:grabbing; }
.cr-idx { font-size:10px; color:#bbb; font-weight:600; min-width:16px; text-align:right; flex-shrink:0; }
.cr-label { flex:1; color:#333; }
.cr-del-btn { opacity:0; background:none; border:none; cursor:pointer; color:#ef4444; font-size:17px; line-height:1; padding:2px 6px; border-radius:4px; transition:opacity .15s,background .15s; flex-shrink:0; }
.cr-del-btn:hover { background:#fee2e2; }
.cr-empty { padding:14px; font-size:12px; color:#bbb; font-style:italic; }
.cr-add-row { padding:10px 12px; border-top:1px solid #f0e8e0; display:flex; gap:6px; background:#faf7f4; }
.cr-add-input { flex:1; border:1px solid #e0d8d0; border-radius:6px; padding:7px 10px; font-size:13px; color:#333; background:#fff; outline:none; }
.cr-add-input:focus { border-color:#7A4610; }
.cr-add-btn { background:#7A4610; color:#fff; border:none; border-radius:6px; padding:7px 16px; font-size:12px; font-weight:700; cursor:pointer; }
.cr-add-btn:hover { background:#5e340c; }
.cr-add-btn:disabled { opacity:.5; cursor:not-allowed; }
.cr-toast { position:fixed; bottom:20px; right:20px; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; z-index:500; pointer-events:none; }
.cr-toast-saving { background:#fef3c7; color:#92400e; }
.cr-toast-ok  { background:#d1fae5; color:#065f46; }
.cr-toast-err { background:#fee2e2; color:#991b1b; }
`;

export default function CancellationReasonsPage() {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loadState, setLoad]  = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErrMsg]   = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding]   = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state
  const dragId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cancellation-reasons')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error(data?.error ?? 'Failed to load');
        setReasons(data);
        setLoad('done');
      })
      .catch((e: Error) => { setErrMsg(e.message); setLoad('error'); });
  }, []);

  function showToast(msg: string, type: 'saving' | 'ok' | 'err') {
    setToastMsg(msg); setToastType(type);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (type !== 'saving') toastTimer.current = setTimeout(() => setToastMsg(''), 2200);
  }

  async function addReason() {
    const label = newLabel.trim();
    if (!label || adding) return;
    setAdding(true);
    showToast('Saving…', 'saving');
    const res = await fetch('/api/cancellation-reasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) { showToast('Save failed', 'err'); setAdding(false); return; }
    const created: Reason = await res.json();
    setReasons(prev => [...prev, created]);
    setNewLabel('');
    setAdding(false);
    showToast('Added', 'ok');
  }

  function onDragStart(e: React.DragEvent, id: string) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    setDraggingId(id);
  }

  function onDragEnd() {
    dragId.current = null;
    setDraggingId(null);
    setOverId(null);
  }

  function onDragOver(e: React.DragEvent, id: string) {
    if (!dragId.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverId(id);
  }

  async function onDrop(e: React.DragEvent, toId: string) {
    e.preventDefault();
    setOverId(null);
    const fromId = dragId.current;
    dragId.current = null;
    setDraggingId(null);
    if (!fromId || fromId === toId) return;

    const fromIdx = reasons.findIndex(r => r.id === fromId);
    const toIdx = reasons.findIndex(r => r.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...reasons];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setReasons(reordered.map((r, i) => ({ ...r, sort_order: (i + 1) * 10 })));

    showToast('Saving order…', 'saving');
    const res = await fetch('/api/cancellation-reasons/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: reordered.map(r => r.id) }),
    });
    showToast(res.ok ? 'Order saved' : 'Save failed', res.ok ? 'ok' : 'err');
  }

  async function delReason(r: Reason) {
    if (!confirm(`Remove "${r.label}"?`)) return;
    setReasons(prev => prev.filter(x => x.id !== r.id));
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/cancellation-reasons/${r.id}`, { method: 'DELETE' });
    showToast(res.ok ? 'Removed' : 'Delete failed', res.ok ? 'ok' : 'err');
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="cr-bar">
        <span className="cr-bar-title">Cancellation Reasons</span>
        <span className="cr-bar-sub">{loadState === 'done' ? `${reasons.length} reason${reasons.length === 1 ? '' : 's'}` : 'Supabase'}</span>
      </div>

      <div className="cr-body">
        {loadState === 'loading' && <div className="cr-state">Loading…</div>}
        {loadState === 'error'   && <div className="cr-state">Failed to load: {errMsg}</div>}
        {loadState === 'done' && (
          <div className="cr-card">
            {reasons.length === 0 && <div className="cr-empty">No reasons yet. Add one below.</div>}
            {reasons.map((r, idx) => (
              <div
                key={r.id}
                className={`cr-row${draggingId === r.id ? ' cr-dragging' : ''}${overId === r.id ? ' cr-over' : ''}`}
                draggable
                onDragStart={e => onDragStart(e, r.id)}
                onDragEnd={onDragEnd}
                onDragOver={e => onDragOver(e, r.id)}
                onDragLeave={() => { if (overId === r.id) setOverId(null); }}
                onDrop={e => onDrop(e, r.id)}
              >
                <span className="cr-drag" title="Drag to reorder" />
                <span className="cr-idx">{idx + 1}</span>
                <span className="cr-label">{r.label}</span>
                <button className="cr-del-btn" title="Remove reason" onClick={() => delReason(r)}>×</button>
              </div>
            ))}
            <div className="cr-add-row">
              <input
                className="cr-add-input"
                placeholder="New cancellation reason…"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addReason(); }}
              />
              <button className="cr-add-btn" disabled={adding || !newLabel.trim()} onClick={addReason}>Add</button>
            </div>
          </div>
        )}
      </div>

      {toastMsg && <div className={`cr-toast cr-toast-${toastType}`}>{toastMsg}</div>}
    </>
  );
}
