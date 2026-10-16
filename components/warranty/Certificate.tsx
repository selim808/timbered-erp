'use client';

import { useEffect, useState } from 'react';
import { GUARANTEE_YEARS, fmtCertDate, validUntil, type Cert } from '@/lib/warranty';

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

/** Styles for the A4 certificate sheet (794×1123 px = 210×297 mm). */
export const CERT_CSS = `
  .wr-cert { width:794px; height:1123px; margin:0 auto; background:#fff; box-shadow:0 4px 16px rgba(122,70,16,.12); flex-shrink:0;
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
`;

export function Certificate({ c }: { c: Cert }) {
  return (
    <div className="wr-cert">
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
          <tr><th>CUSTOMER NAME</th><td>{c.customer}</td></tr>
          <tr><th>ORDER #</th><td>{c.orderNumber}</td></tr>
          <tr><th>PRODUCT</th><td>{c.product}</td></tr>
          <tr><th>QTY</th><td>{c.qty}</td></tr>
          <tr><th>ORDER DATE</th><td>{fmtCertDate(c.startDate)}</td></tr>
          <tr><th>VALID UNTIL</th><td>{fmtCertDate(validUntil(c.startDate))}</td></tr>
        </tbody>
      </table>

      <p className="wr-site">timberedgroup.com</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="wr-seal" src="/warranty/seal.png" alt="" />
    </div>
  );
}

// html2canvas + jsPDF load from the CDN at runtime (same as the Cut List page).
interface PdfWindow {
  html2canvas: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  jspdf: { jsPDF: new (opts: Record<string, unknown>) => {
    addImage: (data: string, fmt: string, x: number, y: number, w: number, h: number) => void;
    addPage: () => void;
    save: (name: string) => void;
  } };
}

const PDF_SCRIPTS = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

/** Loads the PDF libraries once; true when both are ready. */
export function usePdfLibs() {
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    PDF_SCRIPTS.forEach(src => {
      if (document.querySelector(`script[src="${src}"]`)) { setLoaded(n => n + 1); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => setLoaded(n => n + 1);
      document.body.appendChild(s);
    });
  }, []);
  return loaded >= PDF_SCRIPTS.length;
}

/** Renders each certificate sheet to one A4 page of a single PDF and downloads it. */
export async function downloadCertsPdf(
  sheets: ArrayLike<HTMLElement>,
  filename: string,
  onProgress?: (done: number, total: number) => void,
) {
  const w = window as unknown as PdfWindow;
  const { jsPDF } = w.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  for (let i = 0; i < sheets.length; i++) {
    onProgress?.(i + 1, sheets.length);
    const canvas = await w.html2canvas(sheets[i], { scale: 3, backgroundColor: '#ffffff', useCORS: true });
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
  }
  pdf.save(filename);
}
