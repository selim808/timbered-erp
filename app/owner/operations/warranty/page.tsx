'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// html2canvas + jsPDF load from the CDN at runtime (same as the Cut List page).
interface PdfWindow {
  html2canvas: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  jspdf: { jsPDF: new (opts: Record<string, unknown>) => {
    addImage: (data: string, fmt: string, x: number, y: number, w: number, h: number) => void;
    save: (name: string) => void;
  } };
}

const GUARANTEE_YEARS = 3;
/** Extra cover on top of the guarantee, since it starts at order date, not delivery. */
const FULFILMENT_TOLERANCE_MONTHS = 3;
const WHATSAPP = '01003332255';

const COVERED = [
  'Structural defects in wood, joints, and frames under normal use',
  'Faulty hardware, hinges, drawer slides, and fittings we installed',
  'Finish defects present at delivery (peeling, uneven coating)',
];
const NOT_COVERED = [
  'Normal wear, scratches, or fading from sunlight and daily use',
  'Damage from misuse, moisture, pests, or accidents',
  'Unauthorized repairs, modifications, or disassembly',
];

interface WarrantyOrder {
  orderNumber: string;
  status: string;
  customerName: string;
  dateCreated: string;
  lineItems: { id: number; name: string; quantity: number }[];
}

/** yyyy-mm-dd → 03-Sep-2026 (matches the Word template). */
function fmtCertDate(ymd: string) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const mon = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${String(d).padStart(2, '0')}-${mon}-${y}`;
}

function addMonths(ymd: string, months: number) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  // 31-May + 1 month would roll into July; clamp to the last day of the target month.
  if (dt.getUTCDate() !== d) dt.setUTCDate(0);
  return dt.toISOString().slice(0, 10);
}

/** ISO timestamp → yyyy-mm-dd in Cairo time. */
function toYmd(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

function WarrantyInner() {
  const searchParams = useSearchParams();
  const [orderInput, setOrderInput] = useState(searchParams.get('order') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState<WarrantyOrder | null>(null);

  const [customer, setCustomer] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState('');
  const [startDate, setStartDate] = useState('');

  const [scriptsLoaded, setScriptsLoaded] = useState(0);
  const [generating, setGenerating] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);
  const scriptsReady = scriptsLoaded >= 2;

  const validUntil = addMonths(startDate, GUARANTEE_YEARS * 12 + FULFILMENT_TOLERANCE_MONTHS);

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

    const initial = searchParams.get('order');
    if (initial) void loadOrder(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOrder(id: string) {
    const clean = id.trim().replace(/^#/, '');
    if (!clean) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/warranty/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load order');
      const o = data as WarrantyOrder;
      setLoaded(o);
      setCustomer(o.customerName);
      setOrderNo(o.orderNumber);
      setProduct(o.lineItems.map(li => li.name).join('\n'));
      setQty(o.lineItems.length === 1
        ? String(o.lineItems[0].quantity)
        : o.lineItems.map(li => li.quantity).join('\n'));
      setStartDate(toYmd(o.dateCreated));
    } catch (e) {
      setLoaded(null);
      setError(e instanceof Error ? e.message : 'Failed to load order');
    }
    setLoading(false);
  }

  async function downloadPDF() {
    if (!certRef.current || !scriptsReady) return;
    setGenerating(true);
    try {
      const w = window as unknown as PdfWindow;
      const canvas = await w.html2canvas(certRef.current, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
      const { jsPDF } = w.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
      pdf.save(`Timbered_Guarantee_Order-${orderNo || 'draft'}.pdf`);
    } catch (e: unknown) {
      alert('PDF error: ' + (e instanceof Error ? e.message : String(e)));
    }
    setGenerating(false);
  }

  const ready = Boolean(customer && orderNo && product && startDate);

  return (
    <div className="wr-wrap">
      <style>{`
        .wr-wrap { padding:16px 16px 112px; max-width:900px; margin:0 auto; }
        .wr-controls { background:#FFFDF9; border:1px solid #E8D9C4; border-radius:12px; padding:14px; margin-bottom:16px; }
        .wr-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .wr-input { border:1.5px solid #E8D9C4; border-radius:8px; padding:7px 10px; font-size:13px; background:#fff; color:#1C1A17; min-width:0; }
        .wr-input:focus { outline:none; border-color:#7A4610; }
        .wr-btn { font-size:12px; font-weight:700; background:#7A4610; color:#fff; border:none; border-radius:20px; padding:8px 18px; cursor:pointer; white-space:nowrap; }
        .wr-btn:disabled { background:#ccc; cursor:not-allowed; }
        .wr-btn:hover:not(:disabled) { background:#5a3209; }
        .wr-btn-ghost { font-size:12px; font-weight:700; color:#7A4610; border:1.5px solid #7A4610; border-radius:20px; padding:7px 16px; background:none; cursor:pointer; white-space:nowrap; }
        .wr-btn-ghost:hover:not(:disabled) { background:#7A4610; color:#fff; }
        .wr-btn-ghost:disabled { opacity:.4; cursor:not-allowed; }
        .wr-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-top:12px; }
        .wr-field label { display:block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#7A6F65; margin-bottom:4px; }
        .wr-field .wr-input { width:100%; }
        .wr-note { font-size:12px; margin-top:10px; color:#7A6F65; }
        .wr-err { color:#e74c3c; }
        .wr-warn { color:#B86E1A; }

        .wr-preview { overflow-x:auto; }
        /* A4 sheet: 210mm x 297mm */
        .wr-cert { width:794px; height:1123px; margin:0 auto; background:#fff; box-shadow:0 4px 16px rgba(122,70,16,.12);
          font-family: Georgia, 'Times New Roman', serif; color:#2B2620; padding:56px 72px 48px; position:relative; box-sizing:border-box; }
        .wr-logo { display:block; margin:0 auto 18px; width:260px; }
        .wr-rule { border:none; border-top:1.5px solid #9C7A45; margin:0 0 18px; }
        .wr-title { text-align:center; font-size:28px; font-weight:700; letter-spacing:.5px; margin:0 0 8px; }
        .wr-sub { text-align:center; font-size:12.5px; color:#6B6660; margin:0 0 26px; }
        .wr-h { font-size:13px; font-weight:700; color:#9C7A45; letter-spacing:1.5px; margin:0 0 8px; }
        .wr-list { list-style:none; padding:0; margin:0 0 26px; font-size:12.5px; }
        .wr-list li { margin:0 0 6px; }
        .wr-list li::before { content:'—'; color:#9C7A45; margin-right:8px; }
        .wr-claim { font-size:12.5px; color:#6B6660; margin:0 0 20px; }
        .wr-claim b { color:#2B2620; margin:0 3px 0 1px; }
        .wr-rule-light { border:none; border-top:1px solid #E3D6C2; margin:0 0 26px; }
        .wr-table { width:100%; border-collapse:collapse; font-size:12.5px; }
        .wr-table th { text-align:left; font-size:11px; font-weight:700; color:#6B6660; letter-spacing:.5px; padding:9px 8px; width:150px; vertical-align:top; }
        .wr-table td { padding:9px 8px; border-bottom:1px solid #E3D6C2; white-space:pre-line; }
        .wr-site { text-align:center; font-size:12px; color:#9C7A45; margin-top:22px; }
        .wr-seal { position:absolute; right:40px; bottom:36px; width:150px; }

        @media print {
          @page { size:A4 portrait; margin:0; }
          header, nav, .wr-controls { display:none !important; }
          body, .min-h-screen { background:#fff !important; }
          main { padding:0 !important; }
          .wr-wrap { padding:0; max-width:none; }
          .wr-preview { overflow:visible; }
          .wr-cert { box-shadow:none; margin:0; width:210mm; height:297mm; }
        }
      `}</style>

      <div className="wr-controls">
        <form className="wr-row" onSubmit={e => { e.preventDefault(); void loadOrder(orderInput); }}>
          <input
            className="wr-input" style={{ flex: 1, minWidth: 140 }}
            placeholder="Order number, e.g. 21205"
            value={orderInput} onChange={e => setOrderInput(e.target.value)}
            inputMode="numeric"
          />
          <button className="wr-btn" type="submit" disabled={loading || !orderInput.trim()}>
            {loading ? 'Loading…' : 'Load order'}
          </button>
          <button type="button" className="wr-btn-ghost" disabled={!ready} onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="wr-btn" disabled={!ready || !scriptsReady || generating} onClick={() => void downloadPDF()}>
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
        </form>

        {error && <p className="wr-note wr-err">{error}</p>}
        {loaded && loaded.status === 'cancelled' && (
          <p className="wr-note wr-warn">Heads up: this order is cancelled.</p>
        )}

        <div className="wr-grid">
          <div className="wr-field">
            <label>Customer name</label>
            <input className="wr-input" value={customer} onChange={e => setCustomer(e.target.value)} />
          </div>
          <div className="wr-field">
            <label>Order #</label>
            <input className="wr-input" value={orderNo} onChange={e => setOrderNo(e.target.value)} />
          </div>
          <div className="wr-field">
            <label>Product (one per line)</label>
            <textarea className="wr-input" rows={Math.max(1, product.split('\n').length)} value={product} onChange={e => setProduct(e.target.value)} />
          </div>
          <div className="wr-field">
            <label>Qty (one per line)</label>
            <textarea className="wr-input" rows={Math.max(1, qty.split('\n').length)} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div className="wr-field">
            <label>Order date (start)</label>
            <input type="date" className="wr-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="wr-field">
            <label>Valid until ({GUARANTEE_YEARS} yrs + {FULFILMENT_TOLERANCE_MONTHS} mo)</label>
            <input className="wr-input" value={fmtCertDate(validUntil)} readOnly />
          </div>
        </div>
      </div>

      <div className="wr-preview">
        <div className="wr-cert" ref={certRef}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wr-logo" src="/warranty/logo.png" alt="Timbered" />
          <hr className="wr-rule" />
          <h1 className="wr-title">{GUARANTEE_YEARS}-YEAR GUARANTEE</h1>
          <p className="wr-sub">
            Every piece we build is covered against manufacturing defects for three full years from the date of delivery.
          </p>

          <p className="wr-h">WHAT&apos;S COVERED</p>
          <ul className="wr-list">{COVERED.map(t => <li key={t}>{t}</li>)}</ul>

          <p className="wr-h">WHAT&apos;S NOT COVERED</p>
          <ul className="wr-list">{NOT_COVERED.map(t => <li key={t}>{t}</li>)}</ul>

          <p className="wr-h">HOW TO CLAIM</p>
          <p className="wr-claim">
            Message us on WhatsApp at <b>{WHATSAPP}</b> with your order number and photos of the issue. We&apos;ll take it from there.
          </p>
          <hr className="wr-rule-light" />

          <table className="wr-table">
            <tbody>
              <tr><th>CUSTOMER NAME</th><td>{customer}</td></tr>
              <tr><th>ORDER #</th><td>{orderNo}</td></tr>
              <tr><th>PRODUCT</th><td>{product}</td></tr>
              <tr><th>QTY</th><td>{qty}</td></tr>
              <tr><th>ORDER DATE</th><td>{fmtCertDate(startDate)}</td></tr>
              <tr><th>VALID UNTIL</th><td>{fmtCertDate(validUntil)}</td></tr>
            </tbody>
          </table>

          <p className="wr-site">timberedgroup.com</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wr-seal" src="/warranty/seal.png" alt="" />
        </div>
      </div>
    </div>
  );
}

export default function WarrantyPage() {
  return (
    <Suspense>
      <WarrantyInner />
    </Suspense>
  );
}
