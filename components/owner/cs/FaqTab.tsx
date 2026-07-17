'use client';

import { useEffect, useRef, useState } from 'react';
import { useCsToast } from './csShared';

interface Faq {
  id: string;
  category: string | null;
  question: string;
  answer: string;
  sort_order: number;
}

// Editable FAQ/script reference panel. Same drag-to-reorder pattern as
// app/owner/operations/cancellation-reasons/page.tsx.
export default function FaqTab() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');
  const { toastMsg, toastType, showToast } = useCsToast();

  const [category, setCategory] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState('');
  const [editA, setEditA] = useState('');

  const dragId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cs/faq')
      .then(r => r.json())
      .then(data => { setFaqs(Array.isArray(data) ? data : []); setLoadState('done'); })
      .catch(() => setLoadState('error'));
  }, []);

  async function add() {
    if (!question.trim() || !answer.trim() || adding) return;
    setAdding(true);
    showToast('Saving…', 'saving');
    const res = await fetch('/api/cs/faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: category.trim() || undefined, question: question.trim(), answer: answer.trim() }),
    });
    setAdding(false);
    if (!res.ok) { showToast('Save failed', 'err'); return; }
    const created: Faq = await res.json();
    setFaqs(prev => [...prev, created]);
    setCategory(''); setQuestion(''); setAnswer('');
    showToast('Added', 'ok');
  }

  function startEdit(f: Faq) {
    setEditId(f.id); setEditQ(f.question); setEditA(f.answer);
  }

  async function commitEdit() {
    if (!editId) return;
    const id = editId;
    setEditId(null);
    const q = editQ.trim(), a = editA.trim();
    if (!q || !a) return;
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, question: q, answer: a } : f));
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/cs/faq/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, answer: a }),
    });
    showToast(res.ok ? 'Saved' : 'Save failed', res.ok ? 'ok' : 'err');
  }

  async function remove(f: Faq) {
    if (!confirm(`Remove "${f.question}"?`)) return;
    setFaqs(prev => prev.filter(x => x.id !== f.id));
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/cs/faq/${f.id}`, { method: 'DELETE' });
    showToast(res.ok ? 'Removed' : 'Delete failed', res.ok ? 'ok' : 'err');
  }

  function onDragStart(e: React.DragEvent, id: string) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    setDraggingId(id);
  }
  function onDragEnd() { dragId.current = null; setDraggingId(null); setOverId(null); }
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

    const fromIdx = faqs.findIndex(f => f.id === fromId);
    const toIdx = faqs.findIndex(f => f.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...faqs];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setFaqs(reordered.map((f, i) => ({ ...f, sort_order: (i + 1) * 10 })));

    showToast('Saving order…', 'saving');
    const res = await fetch('/api/cs/faq/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: reordered.map(f => f.id) }),
    });
    showToast(res.ok ? 'Order saved' : 'Save failed', res.ok ? 'ok' : 'err');
  }

  return (
    <div>
      <div className="cs-form">
        <div className="cs-section-title">Add a script / FAQ entry</div>
        <input className="cs-input" placeholder="Category (optional)" value={category} onChange={e => setCategory(e.target.value)} />
        <input className="cs-input" placeholder="Question / scenario" value={question} onChange={e => setQuestion(e.target.value)} />
        <textarea className="cs-textarea" placeholder="Answer / script" value={answer} onChange={e => setAnswer(e.target.value)} />
        <div>
          <button className="cs-btn" disabled={adding || !question.trim() || !answer.trim()} onClick={add}>Add entry</button>
        </div>
      </div>

      {loadState === 'loading' && <div className="cs-state">Loading…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load FAQ entries</div>}
      {loadState === 'done' && faqs.length === 0 && <div className="cs-empty">No entries yet.</div>}
      {loadState === 'done' && faqs.length > 0 && (
        <div className="cs-faq-card">
          {faqs.map(f => (
            <div
              key={f.id}
              className="cs-faq-row"
              draggable
              onDragStart={e => onDragStart(e, f.id)}
              onDragEnd={onDragEnd}
              onDragOver={e => onDragOver(e, f.id)}
              onDrop={e => onDrop(e, f.id)}
              style={{
                opacity: draggingId === f.id ? 0.35 : 1,
                borderTop: overId === f.id ? '2px solid #7A4610' : undefined,
                cursor: 'grab',
              }}
            >
              {editId === f.id ? (
                <>
                  <input className="cs-input" style={{ width: '100%', marginBottom: 6 }} value={editQ} onChange={e => setEditQ(e.target.value)} autoFocus />
                  <textarea className="cs-textarea" value={editA} onChange={e => setEditA(e.target.value)} />
                  <div className="cs-faq-actions">
                    <button className="edit" onClick={commitEdit}>Save</button>
                    <button className="del" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  {f.category && <span className="cs-faq-cat">{f.category}</span>}
                  <div className="cs-faq-q">{f.question}</div>
                  <div className="cs-faq-a">{f.answer}</div>
                  <div className="cs-faq-actions">
                    <button className="edit" onClick={() => startEdit(f)}>Edit</button>
                    <button className="del" onClick={() => remove(f)}>Remove</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {toastMsg && <div className={`cs-toast cs-toast-${toastType}`}>{toastMsg}</div>}
    </div>
  );
}
