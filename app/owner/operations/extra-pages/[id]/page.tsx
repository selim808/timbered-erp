'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';

interface ExtraPage {
  id: string;
  title: string;
  slug: string;
  html: string;
  source_filename: string | null;
  updated_at: string;
}

const CSS = `
.xpv-bar { background:#7A4610; color:#fff; padding:0 20px; height:52px; display:flex; align-items:center; gap:12px; position:sticky; top:64px; z-index:100; }
.xpv-bar-back { color:#fff; opacity:.75; font-size:13px; text-decoration:none; flex-shrink:0; }
.xpv-bar-back:hover { opacity:1; }
.xpv-bar-title { font-size:16px; font-weight:700; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.xpv-bar-btn { background:rgba(255,255,255,.15); color:#fff; border:none; border-radius:6px; padding:5px 12px; font-size:12px; font-weight:600; cursor:pointer; flex-shrink:0; }
.xpv-bar-btn:hover { background:rgba(255,255,255,.28); }
.xpv-state { margin:20px; background:#fff; border-radius:10px; padding:32px; text-align:center; color:#999; font-size:14px; border:1px solid #e8ddd4; }
.xpv-frame-wrap { padding:0; background:#fff; }
.xpv-frame { display:block; width:100%; height:calc(100vh - 172px); min-height:420px; border:none; background:#fff; }
.xpv-frame-wrap.xpv-full { position:fixed; inset:0; z-index:900; background:#fff; }
.xpv-frame-wrap.xpv-full .xpv-frame { height:100vh; }
.xpv-exit-full { position:fixed; top:14px; right:14px; z-index:901; background:#7A4610; color:#fff; border:none; border-radius:6px; padding:7px 14px; font-size:12px; font-weight:700; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.25); }
`;

export default function ExtraPageViewer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [page, setPage] = useState<ExtraPage | null>(null);
  const [loadState, setLoad] = useState<'loading' | 'done' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    fetch(`/api/extra-pages/${id}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? 'Failed to load');
        return data as ExtraPage;
      })
      .then(data => { setPage(data); setLoad('done'); })
      .catch((e: Error) => { setErrMsg(e.message); setLoad('error'); });
  }, [id]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  return (
    <>
      <style>{CSS}</style>

      <div className="xpv-bar">
        <Link href="/owner/operations/extra-pages" className="xpv-bar-back">‹ Extra Pages</Link>
        <span className="xpv-bar-title">{page?.title ?? 'Loading…'}</span>
        {loadState === 'done' && (
          <button className="xpv-bar-btn" onClick={() => setFullscreen(true)}>Fullscreen</button>
        )}
      </div>

      {loadState === 'loading' && <div className="xpv-state">Loading…</div>}
      {loadState === 'error' && <div className="xpv-state">Failed to load: {errMsg}</div>}
      {loadState === 'done' && page && (
        <div className={`xpv-frame-wrap${fullscreen ? ' xpv-full' : ''}`}>
          {fullscreen && (
            <button className="xpv-exit-full" onClick={() => setFullscreen(false)}>Exit fullscreen</button>
          )}
          {/*
            The document is handed to the browser byte-for-byte, so its own
            <style>, <script> and layout behave exactly as they do standalone.
            The iframe keeps that document off the app's origin: sandbox without
            allow-same-origin means uploaded markup can run its own scripts but
            cannot reach the ERP's cookies, storage or DOM.
          */}
          <iframe
            className="xpv-frame"
            title={page.title}
            srcDoc={page.html}
            sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
          />
        </div>
      )}
    </>
  );
}
