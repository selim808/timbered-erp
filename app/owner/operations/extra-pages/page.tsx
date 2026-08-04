'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface ExtraPage {
  id: string;
  title: string;
  slug: string;
  source_filename: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

const CSS = `
.xp-bar { background:#7A4610; color:#fff; padding:0 20px; height:52px; display:flex; align-items:center; gap:12px; position:sticky; top:64px; z-index:100; }
.xp-bar-back { color:#fff; opacity:.75; font-size:13px; text-decoration:none; }
.xp-bar-back:hover { opacity:1; }
.xp-bar-title { font-size:16px; font-weight:700; flex:1; }
.xp-bar-sub { font-size:12px; opacity:.6; }
.xp-body { padding:20px; max-width:720px; }
.xp-state { background:#fff; border-radius:10px; padding:32px; text-align:center; color:#999; font-size:14px; border:1px solid #e8ddd4; }
.xp-drop { background:#fff; border:2px dashed #d9c9ba; border-radius:10px; padding:26px 20px; text-align:center; margin-bottom:16px; transition:border-color .15s, background .15s; }
.xp-drop.xp-drop-over { border-color:#7A4610; background:#fdf9f6; }
.xp-drop-title { font-size:14px; font-weight:700; color:#333; margin-bottom:4px; }
.xp-drop-hint { font-size:12px; color:#999; margin-bottom:14px; }
.xp-btn { background:#7A4610; color:#fff; border:none; border-radius:6px; padding:8px 18px; font-size:12px; font-weight:700; cursor:pointer; }
.xp-btn:hover { background:#5e340c; }
.xp-btn:disabled { opacity:.5; cursor:not-allowed; }
.xp-card { background:#fff; border:1px solid #e8ddd4; border-radius:10px; overflow:hidden; }
.xp-row { display:flex; align-items:center; gap:12px; padding:12px 14px; border-bottom:1px solid #f0e8e0; transition:background .15s; }
.xp-row:last-child { border-bottom:none; }
.xp-row:hover { background:#faf7f4; }
.xp-row:hover .xp-act { opacity:1; }
.xp-icon { width:26px; height:26px; border-radius:6px; background:#f3ece6; color:#7A4610; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; flex-shrink:0; }
.xp-main { flex:1; min-width:0; }
.xp-title { display:block; font-size:13px; font-weight:600; color:#333; text-decoration:none; }
.xp-title:hover { color:#7A4610; text-decoration:underline; }
.xp-meta { font-size:11px; color:#aaa; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.xp-act { opacity:0; display:flex; gap:4px; flex-shrink:0; transition:opacity .15s; }
.xp-act-btn { background:none; border:1px solid #e8ddd4; border-radius:5px; cursor:pointer; color:#7A4610; font-size:11px; font-weight:600; padding:4px 8px; }
.xp-act-btn:hover { background:#f3ece6; }
.xp-act-btn.xp-danger { color:#ef4444; border-color:#f3d3d3; }
.xp-act-btn.xp-danger:hover { background:#fee2e2; }
.xp-empty { padding:16px 14px; font-size:12px; color:#bbb; font-style:italic; }
.xp-toast { position:fixed; bottom:20px; right:20px; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; z-index:500; pointer-events:none; }
.xp-toast-saving { background:#fef3c7; color:#92400e; }
.xp-toast-ok  { background:#d1fae5; color:#065f46; }
.xp-toast-err { background:#fee2e2; color:#991b1b; }
`;

function titleFromFilename(name: string) {
  return name.replace(/\.html?$/i, '').replace(/[_-]+/g, ' ').trim() || name;
}

function isHtmlFile(file: File) {
  return /\.html?$/i.test(file.name) || file.type === 'text/html';
}

export default function ExtraPagesPage() {
  const [pages, setPages] = useState<ExtraPage[]>([]);
  const [loadState, setLoad] = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<ExtraPage | null>(null);

  useEffect(() => {
    fetch('/api/extra-pages')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error(data?.error ?? 'Failed to load');
        setPages(data);
        setLoad('done');
      })
      .catch((e: Error) => { setErrMsg(e.message); setLoad('error'); });
  }, []);

  function showToast(msg: string, type: 'saving' | 'ok' | 'err') {
    setToastMsg(msg); setToastType(type);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (type !== 'saving') toastTimer.current = setTimeout(() => setToastMsg(''), 2400);
  }

  // Reads each file as text and stores it untouched — whatever the file says is
  // exactly what the viewer will render.
  async function uploadFiles(files: File[]) {
    const html = files.filter(isHtmlFile);
    if (html.length === 0) {
      showToast('Only .html files', 'err');
      return;
    }
    setBusy(true);
    showToast(html.length === 1 ? 'Uploading…' : `Uploading ${html.length} files…`, 'saving');

    const added: ExtraPage[] = [];
    let failed = 0;

    for (const file of html) {
      if (file.size > MAX_BYTES) { failed++; continue; }
      try {
        const text = await file.text();
        const res = await fetch('/api/extra-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleFromFilename(file.name),
            html: text,
            source_filename: file.name,
          }),
        });
        if (!res.ok) { failed++; continue; }
        added.push(await res.json());
      } catch {
        failed++;
      }
    }

    if (added.length) setPages(prev => [...prev, ...added]);
    setBusy(false);
    if (failed === 0) showToast(added.length === 1 ? 'Page added' : `${added.length} pages added`, 'ok');
    else if (added.length) showToast(`${added.length} added, ${failed} failed`, 'err');
    else showToast('Upload failed', 'err');
  }

  async function onAddPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) await uploadFiles(files);
  }

  async function onReplacePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const target = replaceTarget.current;
    e.target.value = '';
    replaceTarget.current = null;
    if (!file || !target) return;
    if (file.size > MAX_BYTES) { showToast('File is larger than 5 MB', 'err'); return; }

    setBusy(true);
    showToast('Saving…', 'saving');
    const text = await file.text();
    const res = await fetch(`/api/extra-pages/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: text, source_filename: file.name }),
    });
    setBusy(false);
    if (!res.ok) { showToast('Save failed', 'err'); return; }
    const updated: ExtraPage = await res.json();
    setPages(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    showToast('HTML replaced', 'ok');
  }

  function pickReplacement(page: ExtraPage) {
    replaceTarget.current = page;
    replaceInput.current?.click();
  }

  async function renamePage(page: ExtraPage) {
    const title = prompt('Page name', page.title)?.trim();
    if (!title || title === page.title) return;
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/extra-pages/${page.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) { showToast('Rename failed', 'err'); return; }
    const updated: ExtraPage = await res.json();
    setPages(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    showToast('Renamed', 'ok');
  }

  async function deletePage(page: ExtraPage) {
    if (!confirm(`Delete "${page.title}"? The stored HTML is removed too.`)) return;
    setPages(prev => prev.filter(p => p.id !== page.id));
    showToast('Saving…', 'saving');
    const res = await fetch(`/api/extra-pages/${page.id}`, { method: 'DELETE' });
    showToast(res.ok ? 'Deleted' : 'Delete failed', res.ok ? 'ok' : 'err');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) uploadFiles(files);
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="xp-bar">
        <Link href="/owner/operations" className="xp-bar-back">‹ Operations</Link>
        <span className="xp-bar-title">Extra Pages</span>
        <span className="xp-bar-sub">
          {loadState === 'done' ? `${pages.length} page${pages.length === 1 ? '' : 's'}` : 'Supabase'}
        </span>
      </div>

      <div className="xp-body">
        <div
          className={`xp-drop${dragOver ? ' xp-drop-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <p className="xp-drop-title">Upload an HTML file</p>
          <p className="xp-drop-hint">
            Drop .html files here — they are stored and served exactly as written, no changes applied.
          </p>
          <button className="xp-btn" disabled={busy} onClick={() => addInput.current?.click()}>
            {busy ? 'Working…' : 'Choose file'}
          </button>
          <input
            ref={addInput}
            type="file"
            accept=".html,.htm,text/html"
            multiple
            hidden
            onChange={onAddPicked}
          />
          <input
            ref={replaceInput}
            type="file"
            accept=".html,.htm,text/html"
            hidden
            onChange={onReplacePicked}
          />
        </div>

        {loadState === 'loading' && <div className="xp-state">Loading…</div>}
        {loadState === 'error' && <div className="xp-state">Failed to load: {errMsg}</div>}
        {loadState === 'done' && (
          <div className="xp-card">
            {pages.length === 0 && <div className="xp-empty">No pages yet. Upload an HTML file above.</div>}
            {pages.map(page => (
              <div key={page.id} className="xp-row">
                <span className="xp-icon">{'<>'}</span>
                <div className="xp-main">
                  <Link href={`/owner/operations/extra-pages/${page.id}`} className="xp-title">
                    {page.title}
                  </Link>
                  <div className="xp-meta">
                    {page.source_filename ?? page.slug}
                    {' · updated '}
                    {new Date(page.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="xp-act">
                  <button className="xp-act-btn" onClick={() => renamePage(page)}>Rename</button>
                  <button className="xp-act-btn" onClick={() => pickReplacement(page)}>Replace</button>
                  <button className="xp-act-btn xp-danger" onClick={() => deletePage(page)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toastMsg && <div className={`xp-toast xp-toast-${toastType}`}>{toastMsg}</div>}
    </>
  );
}
