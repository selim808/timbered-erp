'use client';

import { useEffect, useRef, useState } from 'react';
import type { Cert } from '@/lib/warranty';
import { CERT_CSS, Certificate, downloadCertsPdf, usePdfLibs } from '@/components/warranty/Certificate';

const SHEET_W = 794;
const SHEET_H = 1123;

export default function PublicCertificate({ cert }: { cert: Cert }) {
  const pdfReady = usePdfLibs();
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);
  // Unscaled copy kept off-screen so the PDF is always full A4 resolution,
  // whatever size the certificate is shown at on the customer's phone.
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fit = () => {
      const w = frameRef.current?.clientWidth ?? SHEET_W;
      setScale(Math.min(1, w / SHEET_W));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  async function download() {
    const sheet = captureRef.current?.querySelector<HTMLElement>('.wr-cert');
    if (!sheet) return;
    setBusy(true);
    try {
      await downloadCertsPdf([sheet], `Timbered_Guarantee_Order-${cert.orderNumber}.pdf`);
    } catch {
      alert('Sorry, the download failed. Please try again.');
    }
    setBusy(false);
  }

  return (
    <div className="gp-wrap">
      <style>{`
        body { background:#FBF5EC; }
        .gp-wrap { padding:16px 16px 32px; max-width:830px; margin:0 auto; width:100%; box-sizing:border-box; }
        .gp-bar { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-bottom:14px; }
        .gp-btn { font-family:'DM Sans',system-ui,sans-serif; font-size:14px; font-weight:700; background:#7A4610; color:#fff; border:none; border-radius:24px; padding:10px 22px; cursor:pointer; }
        .gp-btn:disabled { background:#ccc; cursor:not-allowed; }
        .gp-btn-ghost { background:none; color:#7A4610; border:1.5px solid #7A4610; }
        .gp-frame { width:100%; overflow:hidden; }
        .gp-scaled { transform-origin:top left; }
        .gp-capture { position:fixed; left:-10000px; top:0; }
        ${CERT_CSS}
        @media print {
          @page { size:A4 portrait; margin:0; }
          body { background:#fff; }
          .gp-bar, .gp-capture { display:none !important; }
          .gp-wrap { padding:0; max-width:none; }
          .gp-frame { height:auto !important; overflow:visible; }
          .gp-scaled { transform:none !important; }
          .wr-cert { box-shadow:none; margin:0; width:210mm; height:297mm; }
        }
      `}</style>

      <div className="gp-bar">
        <button className="gp-btn" disabled={!pdfReady || busy} onClick={() => void download()}>
          {busy ? 'Preparing…' : 'Download PDF'}
        </button>
        <button className="gp-btn gp-btn-ghost" onClick={() => window.print()}>Print</button>
      </div>

      <div className="gp-frame" ref={frameRef} style={{ height: SHEET_H * scale }}>
        <div className="gp-scaled" style={{ transform: `scale(${scale})`, width: SHEET_W }}>
          <Certificate c={cert} />
        </div>
      </div>

      <div className="gp-capture" ref={captureRef} aria-hidden>
        <Certificate c={cert} />
      </div>
    </div>
  );
}
