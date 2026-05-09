'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface BomPart {
  name: string;
  thx: string;
  x: string | number;
  y: string | number;
  qty: number;
  material: string;
  remarks: string;
}

interface JoPlanItem {
  product_id: number;
  product_name: string;
  image: string;
  total_qty: number;
}

interface JoPlan {
  id: string;
  ref: string;
  status: string;
  items: JoPlanItem[];
  created_at: string;
}

declare global {
  interface Window {
    html2canvas: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
    jspdf: { jsPDF: new (opts: Record<string, unknown>) => any };
  }
}

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CAPTURE_SCALE = 4;
const INLINE_SCALE = 2;

function CutlistInner() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<JoPlan[]>([]);
  const [selectedId, setSelectedId] = useState(searchParams.get('jo') ?? '');
  const [currentPlan, setCurrentPlan] = useState<JoPlan | null>(null);
  const [bomMap, setBomMap] = useState<Record<number, BomPart[]>>({});
  const [loadingBom, setLoadingBom] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [scriptsLoaded, setScriptsLoaded] = useState(0);
  const displayRef = useRef<HTMLDivElement>(null);
  const scriptsReady = scriptsLoaded >= 2;

  useEffect(() => {
    const load = (src: string) => {
      if (document.querySelector(`script[src="${src}"]`)) { setScriptsLoaded(n => n + 1); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => setScriptsLoaded(n => n + 1);
      document.body.appendChild(s);
    };
    load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

    fetch('/api/job-orders')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPlans(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId || plans.length === 0) return;
    const plan = plans.find(p => p.id === selectedId);
    if (plan) void loadBom(plan);
  }, [selectedId, plans]);

  async function loadBom(plan: JoPlan) {
    setCurrentPlan(plan);
    setLoadingBom(true);
    setBomMap({});
    const ids = [...new Set(plan.items.map(i => i.product_id).filter(Boolean))];
    const entries = await Promise.all(
      ids.map(async pid => {
        try {
          const r = await fetch(`/api/products/${pid}/bom`);
          const bom = await r.json();
          return [pid, Array.isArray(bom) ? bom : []] as [number, BomPart[]];
        } catch { return [pid, []] as [number, BomPart[]]; }
      })
    );
    setBomMap(Object.fromEntries(entries));
    setLoadingBom(false);
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    if (!id) {
      setCurrentPlan(null);
      setBomMap({});
      window.history.replaceState(null, '', '/owner/pipeline/job-orders/cutlist');
      return;
    }
    window.history.replaceState(null, '', `/owner/pipeline/job-orders/cutlist?jo=${id}`);
    const plan = plans.find(p => p.id === id);
    if (plan) void loadBom(plan);
  }

  // ── capture helpers ──────────────────────────────────────────────────────────

  async function imgToDataURL(src: string, w: number, h: number): Promise<string> {
    const res = await fetch(`https://images.weserv.nl/?url=${encodeURIComponent(src)}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = blobUrl;
    });
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / scale, sh = h / scale;
    const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    URL.revokeObjectURL(blobUrl);
    return c.toDataURL('image/png');
  }

  async function inlineImgs(el: HTMLElement) {
    const imgs = [...el.querySelectorAll('img')] as HTMLImageElement[];
    await Promise.all(imgs.map(async img => {
      try {
        const w = (img.offsetWidth || 100) * CAPTURE_SCALE * INLINE_SCALE;
        const h = (img.offsetHeight || 100) * CAPTURE_SCALE * INLINE_SCALE;
        img.src = await imgToDataURL(img.src, w, h);
        img.style.objectFit = 'fill';
      } catch (_) {}
    }));
  }

  async function capture(el: HTMLElement) {
    const fullW = el.scrollWidth, fullH = el.scrollHeight;
    const clone = el.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, {
      position: 'fixed', top: '0', left: '-99999px', width: fullW + 'px',
      overflow: 'visible', background: '#fff', pointerEvents: 'none',
    });
    document.body.appendChild(clone);
    await inlineImgs(clone);
    const cloneTop = clone.getBoundingClientRect().top;
    let blocks = [...clone.querySelectorAll('.cl-card')] as HTMLElement[];
    if (!blocks.length) blocks = [...clone.querySelectorAll('.cl-product-cell')] as HTMLElement[];
    const first = blocks[0];
    const headerH = first ? Math.round((first.getBoundingClientRect().top - cloneTop) * CAPTURE_SCALE) : 0;
    const breaks = blocks.slice(1).map(e => e.getBoundingClientRect().top - cloneTop);
    const canvas = await window.html2canvas(clone, {
      scale: CAPTURE_SCALE, backgroundColor: '#ffffff', logging: false,
      width: fullW, height: fullH, useCORS: true,
    });
    document.body.removeChild(clone);
    return { canvas, breaks, headerH };
  }

  function sliceCanvas(canvas: HTMLCanvasElement, srcY: number, slicePx: number, headerH: number, page: number) {
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = page === 0 ? slicePx : headerH + slicePx;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    if (page === 0) {
      ctx.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
    } else {
      ctx.drawImage(canvas, 0, 0, canvas.width, headerH, 0, 0, canvas.width, headerH);
      ctx.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, headerH, canvas.width, slicePx);
    }
    return c;
  }

  async function downloadPDF() {
    if (!displayRef.current || !scriptsReady || !currentPlan) return;
    const btn = document.getElementById('cl-pdf-btn') as HTMLButtonElement;
    if (btn) { btn.textContent = 'Generating…'; btn.disabled = true; }
    try {
      const { canvas, breaks, headerH } = await capture(displayRef.current);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const pxPerMm = canvas.width / pageW;
      const pageHpx = Math.round(pageH * pxPerMm);
      const breaksPx = breaks.map((y: number) => Math.round(y * CAPTURE_SCALE));
      let srcY = 0, pg = 0;
      while (srcY < canvas.height) {
        if (pg > 0) pdf.addPage();
        const reserve = pg === 0 ? 0 : headerH;
        const maxEnd = Math.min(srcY + pageHpx - reserve, canvas.height);
        const cands = breaksPx.filter((b: number) => b > srcY && b <= maxEnd);
        const endY = cands.length ? Math.max(...cands) : maxEnd;
        const imgC = sliceCanvas(canvas, srcY, endY - srcY, headerH, pg);
        pdf.addImage(imgC.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgC.height / pxPerMm);
        srcY = endY; pg++;
      }
      pdf.save(`Cutlist-${currentPlan.ref}.pdf`);
    } catch (e: any) { alert('PDF error: ' + e.message); }
    if (btn) { btn.textContent = 'Download PDF'; btn.disabled = false; }
  }

  async function downloadImage() {
    if (!displayRef.current || !scriptsReady || !currentPlan) return;
    const btn = document.getElementById('cl-img-btn') as HTMLButtonElement;
    if (btn) { btn.textContent = 'Generating…'; btn.disabled = true; }
    try {
      const { canvas, breaks, headerH } = await capture(displayRef.current);
      const pageHpx = Math.round(canvas.width * 297 / 210);
      const breaksPx = breaks.map((y: number) => Math.round(y * CAPTURE_SCALE));
      const pages: HTMLCanvasElement[] = [];
      let srcY = 0, pg = 0;
      while (srcY < canvas.height) {
        const reserve = pg === 0 ? 0 : headerH;
        const maxEnd = Math.min(srcY + pageHpx - reserve, canvas.height);
        const cands = breaksPx.filter((b: number) => b > srcY && b <= maxEnd);
        const endY = cands.length ? Math.max(...cands) : maxEnd;
        pages.push(sliceCanvas(canvas, srcY, endY - srcY, headerH, pg));
        srcY = endY; pg++;
      }
      pages.forEach((pc, idx) => {
        const a = document.createElement('a');
        a.href = pc.toDataURL('image/png');
        a.download = `Cutlist-${currentPlan.ref}${pages.length > 1 ? `-${String(idx + 1).padStart(2, '0')}` : ''}.png`;
        a.click();
      });
    } catch (e: any) { alert('Image error: ' + e.message); }
    if (btn) { btn.textContent = 'Download Image'; btn.disabled = false; }
  }

  // ── render helpers ───────────────────────────────────────────────────────────

  function renderTable() {
    if (!currentPlan) return null;
    const rows = currentPlan.items.flatMap((item, iIdx) => {
      const bom = bomMap[item.product_id] ?? [];
      const thumb = item.image
        ? <img src={item.image} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4, display: 'block', margin: '0 auto' }} alt="" />
        : null;
      if (!bom.length) {
        return [(
          <tr key={`${iIdx}-e`}>
            <td className="cl-product-cell">{item.product_name}</td>
            <td className="cl-qty-cell">{item.total_qty}</td>
            <td className="cl-img-cell">{thumb}</td>
            <td colSpan={8} className="cl-no-bom">No BOM data</td>
          </tr>
        )];
      }
      return bom.map((part, pIdx) => {
        const total = (part.qty || 0) * (item.total_qty || 0);
        if (pIdx === 0) return (
          <tr key={`${iIdx}-${pIdx}`}>
            <td className="cl-product-cell" rowSpan={bom.length}>{item.product_name}</td>
            <td className="cl-qty-cell" rowSpan={bom.length}>{item.total_qty}</td>
            <td className="cl-img-cell" rowSpan={bom.length}>{thumb}</td>
            <td className="cl-center">{part.name}</td>
            <td className="cl-center">{part.thx}</td>
            <td className="cl-center">{part.x}</td>
            <td className="cl-center">{part.y}</td>
            <td className="cl-center">{part.qty}</td>
            <td className="cl-total-qty">{total}</td>
            <td className="cl-center">{part.material}</td>
            <td className="cl-center">{part.remarks}</td>
          </tr>
        );
        return (
          <tr key={`${iIdx}-${pIdx}`}>
            <td className="cl-center">{part.name}</td>
            <td className="cl-center">{part.thx}</td>
            <td className="cl-center">{part.x}</td>
            <td className="cl-center">{part.y}</td>
            <td className="cl-center">{part.qty}</td>
            <td className="cl-total-qty">{total}</td>
            <td className="cl-center">{part.material}</td>
            <td className="cl-center">{part.remarks}</td>
          </tr>
        );
      });
    });
    return (
      <table className="cl-table">
        <thead>
          <tr>
            <th style={{ width: 100, minWidth: 100 }}>Product</th>
            <th style={{ width: 48 }}>QTY</th>
            <th>Picture</th>
            <th>Name</th><th>Thk</th><th>X (cm)</th><th>Y (cm)</th>
            <th style={{ width: 48 }}>QTY</th>
            <th style={{ width: 30, minWidth: 30 }}>Total</th>
            <th>Material</th>
            <th style={{ width: 150, minWidth: 150 }}>Remarks</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  }

  function renderCards() {
    if (!currentPlan) return null;
    return (
      <div className="cl-cards-wrap">
        <div className="cl-cards">
          {currentPlan.items.map((item, idx) => {
            const bom = bomMap[item.product_id] ?? [];
            return (
              <div key={idx} className="cl-card">
                <div className="cl-card-header">
                  {item.image
                    ? <img className="cl-card-img" src={item.image} alt="" />
                    : <div className="cl-card-img-ph" />}
                  <div className="cl-card-name">{item.product_name}</div>
                  <div className="cl-card-qty">Total: {item.total_qty}</div>
                </div>
                {bom.length ? (
                  <table className="cl-parts-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Name</th><th>Thk</th><th>X (cm)</th><th>Y (cm)</th>
                        <th style={{ width: 48 }}>QTY</th>
                        <th style={{ width: 30 }}>Total</th>
                        <th>Material</th>
                        <th style={{ width: 150 }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.map((part, pIdx) => (
                        <tr key={pIdx}>
                          <td>{pIdx + 1}</td>
                          <td className="cl-part-name-td">{part.name}</td>
                          <td>{String(part.thx || '').replace(/\s*mm\s*$/i, '')}</td>
                          <td>{part.x}</td><td>{part.y}</td><td>{part.qty}</td>
                          <td className="cl-part-total">{(part.qty || 0) * (item.total_qty || 0)}</td>
                          <td>{part.material}</td><td>{part.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="cl-no-bom-card">No BOM data</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const hasDisplay = !!currentPlan && !loadingBom;

  return (
    <>
      <style>{`
        .cl-controls { background:#fff; border-bottom:1px solid #e8ddd4; padding:10px 16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; position:sticky; top:64px; z-index:50; }
        .cl-jo-select { flex:1; min-width:200px; font-size:13px; padding:7px 10px; border:1.5px solid #e8ddd4; border-radius:8px; outline:none; color:#333; background:#fff; }
        .cl-jo-select:focus { border-color:#7A4610; }
        .cl-view-toggle { display:flex; border:1.5px solid #e8ddd4; border-radius:8px; overflow:hidden; flex-shrink:0; }
        .cl-vtb { font-size:11px; font-weight:700; padding:6px 13px; border:none; background:none; cursor:pointer; color:#aaa; white-space:nowrap; }
        .cl-vtb.active { background:#7A4610; color:#fff; }
        .cl-vtb:disabled { opacity:.4; cursor:not-allowed; }
        .cl-pdf-btn { font-size:12px; font-weight:700; background:#7A4610; color:#fff; border:none; border-radius:20px; padding:7px 18px; cursor:pointer; white-space:nowrap; flex-shrink:0; }
        .cl-pdf-btn:disabled { background:#ccc; cursor:not-allowed; }
        .cl-pdf-btn:hover:not(:disabled) { background:#5a3209; }
        .cl-print-btn { font-size:12px; font-weight:700; color:#7A4610; border:1.5px solid #7A4610; border-radius:20px; padding:6px 16px; background:none; cursor:pointer; white-space:nowrap; flex-shrink:0; }
        .cl-print-btn:hover:not(:disabled) { background:#7A4610; color:#fff; }
        .cl-print-btn:disabled { opacity:.4; cursor:not-allowed; }

        .cl-wrap { padding:16px; max-width:1200px; margin:0 auto; padding-bottom:80px; }
        .cl-state-msg { text-align:center; color:#aaa; padding:60px 20px; font-size:14px; }

        .cl-display { background:#fff; border-radius:8px; border:1px solid #e8ddd4; padding:28px; overflow-x:auto; }

        .cl-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
        .cl-logo { font-size:26px; font-weight:900; color:#7A4610; letter-spacing:1px; }
        .cl-sub { font-size:13px; color:#888; margin-top:3px; }
        .cl-meta { text-align:right; }
        .cl-ref { font-size:22px; font-weight:800; color:#7A4610; }
        .cl-date { font-size:13px; color:#888; margin-top:2px; }

        .cl-table { width:100%; border-collapse:collapse; min-width:700px; }
        .cl-table th { background:#7A4610; color:#fff; padding:8px 10px; font-size:15px; font-weight:800; text-align:center; white-space:nowrap; }
        .cl-table td { padding:7px 10px; border:1px solid #e0d8d0; font-size:15px; font-weight:650; color:#000; vertical-align:middle; }
        .cl-table tr:nth-child(even) td { background:#faf7f4; }
        .cl-product-cell { font-weight:800; text-align:center; border-right:2px solid #c8b89a !important; width:100px; min-width:100px; font-size:14px; word-break:break-word; }
        .cl-qty-cell { text-align:center; font-weight:700; border-right:2px solid #c8b89a !important; width:48px; max-width:48px; }
        .cl-img-cell { text-align:center; border-right:2px solid #c8b89a !important; width:110px; padding:4px !important; }
        .cl-total-qty { font-weight:700; color:#7A4610; text-align:center; width:30px; min-width:30px; }
        .cl-part-total { font-weight:700; color:#7A4610; width:30px; min-width:30px; }
        .cl-center { text-align:center; }
        .cl-no-bom { color:#aaa; font-style:italic; text-align:center; }

        .cl-footer { margin-top:20px; font-size:12px; color:#aaa; text-align:center; }

        .cl-cards { display:flex; flex-direction:column; gap:14px; }
        .cl-card { border:2px solid #b89a7a; border-radius:8px; overflow:hidden; }
        .cl-card-header { display:flex; align-items:center; gap:12px; padding:12px 16px; background:#fdf8f4; border-bottom:2px solid #e8ddd4; }
        .cl-card-img { width:64px; height:64px; object-fit:cover; border-radius:6px; border:1px solid #e8ddd4; flex-shrink:0; }
        .cl-card-img-ph { width:64px; height:64px; border-radius:6px; background:#f0e8e0; flex-shrink:0; }
        .cl-card-name { flex:1; font-size:17px; font-weight:800; color:#333; }
        .cl-card-qty { font-size:14px; font-weight:800; color:#7A4610; background:#fef3e2; border:1.5px solid #f5c842; border-radius:20px; padding:5px 14px; flex-shrink:0; }
        .cl-parts-table { width:100%; border-collapse:collapse; }
        .cl-parts-table th { background:#f5f0eb; color:#7A4610; padding:7px 10px; font-size:14px; font-weight:800; text-align:center; border-bottom:1px solid #e8ddd4; }
        .cl-parts-table td { padding:7px 10px; border-bottom:1px solid #f0ebe4; font-size:15px; font-weight:650; color:#000; text-align:center; vertical-align:middle; }
        .cl-parts-table tr:last-child td { border-bottom:none; }
        .cl-parts-table tr:nth-child(even) td { background:#faf7f4; }
        .cl-part-name-td { text-align:left !important; font-weight:600; }
        .cl-no-bom-card { padding:12px 16px; color:#aaa; font-style:italic; font-size:14px; }
        .cl-cards-wrap { padding:3px 4px; }

        @media print {
          @page { size:A4 portrait; margin:12mm; }
          .cl-controls, nav { display:none !important; }
          body { background:#fff; }
          .cl-wrap { padding:0; max-width:none; }
          .cl-display { border:none; border-radius:0; padding:0; box-shadow:none; }
          .cl-table { min-width:unset; }
          .cl-card { page-break-inside:avoid; break-inside:avoid; }
          .cl-table tbody tr { page-break-inside:avoid; break-inside:avoid; }
        }
      `}</style>

      {/* Controls */}
      <div className="cl-controls">
        <select className="cl-jo-select" value={selectedId} onChange={e => handleSelect(e.target.value)}>
          <option value="">— Select a Job Order —</option>
          {plans.map(p => (
            <option key={p.id} value={p.id}>{p.ref} · {fmtDate(p.created_at)}</option>
          ))}
        </select>
        <div className="cl-view-toggle">
          <button className={`cl-vtb${viewMode === 'table' ? ' active' : ''}`} disabled={!hasDisplay} onClick={() => setViewMode('table')}>Table</button>
          <button className={`cl-vtb${viewMode === 'card' ? ' active' : ''}`} disabled={!hasDisplay} onClick={() => setViewMode('card')}>Cards</button>
        </div>
        <button id="cl-pdf-btn" className="cl-pdf-btn" disabled={!hasDisplay || !scriptsReady} onClick={downloadPDF}>Download PDF</button>
        <button id="cl-img-btn" className="cl-print-btn" disabled={!hasDisplay || !scriptsReady} onClick={downloadImage}>Download Image</button>
        <button className="cl-print-btn" disabled={!hasDisplay} onClick={() => window.print()}>Print</button>
      </div>

      {/* Content */}
      <div className="cl-wrap">
        {loadingBom ? (
          <div className="cl-state-msg">Loading BOM data…</div>
        ) : !currentPlan ? (
          <div className="cl-state-msg">Select a Job Order to view its cutlist</div>
        ) : (
          <div className="cl-display" ref={displayRef}>
            <div className="cl-header">
              <div>
                <div className="cl-logo">TIMBERED</div>
                <div className="cl-sub">Cutlist</div>
              </div>
              <div className="cl-meta">
                <div className="cl-ref">{currentPlan.ref}</div>
                <div className="cl-date">{fmtDate(currentPlan.created_at)}</div>
              </div>
            </div>
            {viewMode === 'table' ? renderTable() : renderCards()}
            <div className="cl-footer">
              Generated {new Date().toLocaleString('en-GB')} · Timbered Dashboard
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function CutlistPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontSize: 14 }}>Loading…</div>}>
      <CutlistInner />
    </Suspense>
  );
}
