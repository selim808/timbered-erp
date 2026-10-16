'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FULFILMENT_TOLERANCE_MONTHS, GUARANTEE_YEARS, certFromOrder, fmtCertDate, toYmd, validUntil,
  type Cert, type WarrantyOrder,
} from '@/lib/warranty';
import type { WarrantyOrdersResponse } from '@/app/api/warranty/route';
import { CERT_CSS, Certificate, downloadCertsPdf, usePdfLibs } from '@/components/warranty/Certificate';

/** Parallel order lookups when adding a pasted list of numbers. */
const FETCH_CONCURRENCY = 4;

function isComplete(c: Cert) {
  return Boolean(c.customer && c.orderNumber && c.product && c.startDate);
}

/** "21205, 21206 #21207" → ['21205', '21206', '21207'], deduped. */
function parseNumbers(text: string) {
  return [...new Set(text.split(/[\s,;]+/).map(s => s.replace(/^#/, '').trim()).filter(Boolean))];
}

function WarrantyInner() {
  const searchParams = useSearchParams();
  const initialNumbers = [searchParams.get('order'), searchParams.get('orders')].filter(Boolean).join(',');

  const [certs, setCerts] = useState<Cert[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const [numbersInput, setNumbersInput] = useState(initialNumbers);
  const [adding, setAdding] = useState(false);
  const [addErrors, setAddErrors] = useState<string[]>([]);

  const [browseOpen, setBrowseOpen] = useState(false);
  const [browse, setBrowse] = useState<WarrantyOrdersResponse | null>(null);
  const [browseQ, setBrowseQ] = useState('');
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState('');
  const [picked, setPicked] = useState<Map<string, WarrantyOrder>>(new Map());

  const [progress, setProgress] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const scriptsReady = usePdfLibs();

  useEffect(() => {
    if (initialNumbers) void addNumbers(initialNumbers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Appends orders to the print list, skipping ones already in it. */
  function addOrders(orders: WarrantyOrder[]) {
    setCerts(prev => {
      const have = new Set(prev.map(c => c.orderNumber));
      const fresh = orders.filter(o => !have.has(o.orderNumber)).map(certFromOrder);
      return [...prev, ...fresh];
    });
  }

  async function addNumbers(text: string) {
    const numbers = parseNumbers(text);
    if (numbers.length === 0) return;
    setAdding(true); setAddErrors([]);

    const found: WarrantyOrder[] = [];
    const errors: string[] = [];
    const queue = [...numbers];
    async function worker() {
      for (let n = queue.shift(); n !== undefined; n = queue.shift()) {
        try {
          const res = await fetch(`/api/warranty/${encodeURIComponent(n)}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? 'Failed to load');
          found.push(data as WarrantyOrder);
        } catch (e) {
          errors.push(`#${n}: ${e instanceof Error ? e.message : 'Failed to load'}`);
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, numbers.length) }, worker));

    // Keep the order the numbers were typed in, not the order lookups finished.
    found.sort((a, b) => numbers.indexOf(a.orderNumber) - numbers.indexOf(b.orderNumber));
    addOrders(found);
    setAddErrors(errors);
    if (errors.length === 0) setNumbersInput('');
    setAdding(false);
  }

  async function loadBrowse(page: number, q = browseQ) {
    setBrowseLoading(true); setBrowseError('');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/warranty?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load orders');
      setBrowse(data as WarrantyOrdersResponse);
    } catch (e) {
      setBrowseError(e instanceof Error ? e.message : 'Failed to load orders');
    }
    setBrowseLoading(false);
  }

  function toggleBrowse() {
    const next = !browseOpen;
    setBrowseOpen(next);
    if (next && !browse) void loadBrowse(1);
  }

  function togglePick(o: WarrantyOrder) {
    setPicked(prev => {
      const next = new Map(prev);
      if (next.has(o.orderNumber)) next.delete(o.orderNumber); else next.set(o.orderNumber, o);
      return next;
    });
  }

  function togglePickPage() {
    if (!browse) return;
    const pageOrders = browse.orders;
    const allPicked = pageOrders.every(o => picked.has(o.orderNumber));
    setPicked(prev => {
      const next = new Map(prev);
      pageOrders.forEach(o => { if (allPicked) next.delete(o.orderNumber); else next.set(o.orderNumber, o); });
      return next;
    });
  }

  function addPicked() {
    addOrders([...picked.values()]);
    setPicked(new Map());
  }

  function updateCert(key: string, patch: Partial<Omit<Cert, 'orderNumber'>>) {
    setCerts(prev => prev.map(c => (c.orderNumber === key ? { ...c, ...patch } : c)));
  }

  function removeCert(key: string) {
    setCerts(prev => prev.filter(c => c.orderNumber !== key));
    if (activeKey === key) setActiveKey(null);
  }

  async function downloadPDF() {
    const nodes = previewRef.current?.querySelectorAll<HTMLElement>('.wr-cert');
    if (!nodes?.length || !scriptsReady) return;
    try {
      await downloadCertsPdf(
        nodes,
        certs.length === 1
          ? `Timbered_Guarantee_Order-${certs[0].orderNumber}.pdf`
          : `Timbered_Guarantees_${certs.length}-orders.pdf`,
        (done, total) => setProgress(total > 1 ? `Generating ${done}/${total}…` : 'Generating…'),
      );
    } catch (e: unknown) {
      alert('PDF error: ' + (e instanceof Error ? e.message : String(e)));
    }
    setProgress(null);
  }

  const incomplete = certs.filter(c => !isComplete(c));
  const ready = certs.length > 0 && incomplete.length === 0;
  const active = certs.find(c => c.orderNumber === activeKey) ?? null;
  const browseAllPicked = Boolean(browse?.orders.length) && browse!.orders.every(o => picked.has(o.orderNumber));
  const inList = new Set(certs.map(c => c.orderNumber));

  return (
    <div className="wr-wrap">
      <style>{`
        .wr-wrap { padding:16px 16px 112px; max-width:900px; margin:0 auto; }
        .wr-panel { background:#FFFDF9; border:1px solid #E8D9C4; border-radius:12px; padding:14px; margin-bottom:12px; }
        .wr-panel-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#7A6F65; margin:0 0 10px; display:flex; align-items:center; gap:8px; }
        .wr-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .wr-input { border:1.5px solid #E8D9C4; border-radius:8px; padding:7px 10px; font-size:13px; background:#fff; color:#1C1A17; min-width:0; }
        .wr-input:focus { outline:none; border-color:#7A4610; }
        .wr-btn { font-size:12px; font-weight:700; background:#7A4610; color:#fff; border:none; border-radius:20px; padding:8px 18px; cursor:pointer; white-space:nowrap; }
        .wr-btn:disabled { background:#ccc; cursor:not-allowed; }
        .wr-btn:hover:not(:disabled) { background:#5a3209; }
        .wr-btn-ghost { font-size:12px; font-weight:700; color:#7A4610; border:1.5px solid #7A4610; border-radius:20px; padding:7px 16px; background:none; cursor:pointer; white-space:nowrap; }
        .wr-btn-ghost:hover:not(:disabled) { background:#7A4610; color:#fff; }
        .wr-btn-ghost:disabled { opacity:.4; cursor:not-allowed; }
        .wr-link { font-size:12px; font-weight:600; color:#7A4610; background:none; border:none; cursor:pointer; padding:2px 4px; }
        .wr-link:hover:not(:disabled) { text-decoration:underline; }
        .wr-link:disabled { opacity:.4; cursor:not-allowed; }
        .wr-link-danger { color:#e74c3c; }
        .wr-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-top:12px; }
        .wr-field label { display:block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#7A6F65; margin-bottom:4px; }
        .wr-field .wr-input { width:100%; }
        .wr-note { font-size:12px; margin-top:8px; color:#7A6F65; }
        .wr-err { color:#e74c3c; }
        .wr-warn { color:#B86E1A; }
        .wr-count { background:#7A4610; color:#fff; border-radius:10px; padding:1px 8px; font-size:11px; letter-spacing:0; }

        .wr-items { border:1px solid #E8D9C4; border-radius:8px; overflow:hidden; background:#fff; }
        .wr-item { display:flex; align-items:center; gap:10px; padding:8px 10px; border-bottom:1px solid #F0E6D8; font-size:13px; }
        .wr-item:last-child { border-bottom:none; }
        .wr-item.active { background:#fef3e2; }
        .wr-item-main { flex:1; min-width:0; }
        .wr-item-title { font-weight:600; color:#1C1A17; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .wr-item-sub { font-size:11px; color:#7A6F65; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .wr-item input[type=checkbox] { width:16px; height:16px; accent-color:#7A4610; flex-shrink:0; }
        .wr-badge { font-size:10px; font-weight:700; border-radius:10px; padding:1px 7px; background:#F4CFA5; color:#7A4610; margin-left:6px; }
        .wr-badge-danger { background:#fde2df; color:#c0392b; }
        .wr-browse-list { max-height:360px; overflow-y:auto; }
        .wr-empty { font-size:12px; color:#7A6F65; text-align:center; padding:16px; }

        .wr-preview { overflow-x:auto; display:flex; flex-direction:column; gap:16px; }
        ${CERT_CSS}

        @media print {
          @page { size:A4 portrait; margin:0; }
          header, nav, .wr-controls { display:none !important; }
          body, .min-h-screen { background:#fff !important; }
          main { padding:0 !important; }
          .wr-wrap { padding:0; max-width:none; }
          .wr-preview { overflow:visible; display:block; }
          .wr-cert { box-shadow:none; margin:0; width:210mm; height:297mm; break-after:page; page-break-after:always; }
          .wr-cert:last-child { break-after:auto; page-break-after:auto; }
        }
      `}</style>

      <div className="wr-controls">
        {/* Add orders */}
        <div className="wr-panel">
          <p className="wr-panel-title">Add orders</p>
          <form className="wr-row" onSubmit={e => { e.preventDefault(); void addNumbers(numbersInput); }}>
            <input
              className="wr-input" style={{ flex: 1, minWidth: 180 }}
              placeholder="Order numbers, e.g. 21205, 21206 21210"
              value={numbersInput} onChange={e => setNumbersInput(e.target.value)}
            />
            <button className="wr-btn" type="submit" disabled={adding || !numbersInput.trim()}>
              {adding ? 'Adding…' : 'Add'}
            </button>
            <button type="button" className="wr-btn-ghost" onClick={toggleBrowse}>
              {browseOpen ? 'Hide completed orders' : 'Pick from completed orders'}
            </button>
          </form>
          {addErrors.length > 0 && (
            <p className="wr-note wr-err">Couldn&apos;t add: {addErrors.join(' · ')}</p>
          )}

          {browseOpen && (
            <div style={{ marginTop: 12 }}>
              <form className="wr-row" style={{ marginBottom: 8 }} onSubmit={e => { e.preventDefault(); void loadBrowse(1); }}>
                <input
                  className="wr-input" style={{ flex: 1, minWidth: 160 }}
                  placeholder="Search order # or customer"
                  value={browseQ} onChange={e => setBrowseQ(e.target.value)}
                />
                <button className="wr-btn-ghost" type="submit" disabled={browseLoading}>Search</button>
              </form>

              {browseError && <p className="wr-note wr-err">{browseError}</p>}
              {browseLoading && !browse && <p className="wr-empty">Loading completed orders…</p>}

              {browse && (
                <>
                  <div className="wr-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="wr-row" style={{ gap: 6, fontSize: 12, color: '#7A6F65', cursor: 'pointer' }}>
                      <input type="checkbox" checked={browseAllPicked} onChange={togglePickPage} disabled={!browse.orders.length} />
                      Select all on this page
                    </label>
                    <span style={{ fontSize: 12, color: '#7A6F65' }}>
                      {browseLoading ? 'Loading…' : `${browse.total} completed`}
                    </span>
                  </div>
                  <div className="wr-items wr-browse-list">
                    {browse.orders.length === 0 && <p className="wr-empty">No completed orders match.</p>}
                    {browse.orders.map(o => (
                      <label key={o.orderNumber} className="wr-item" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={picked.has(o.orderNumber)} onChange={() => togglePick(o)} />
                        <div className="wr-item-main">
                          <div className="wr-item-title">
                            #{o.orderNumber} · {o.customerName || 'No name'}
                            {inList.has(o.orderNumber) && <span className="wr-badge">in list</span>}
                          </div>
                          <div className="wr-item-sub">
                            {fmtCertDate(toYmd(o.dateCreated))} · {o.lineItems.map(li => `${li.name} ×${li.quantity}`).join(', ')}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="wr-row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                    <div className="wr-row" style={{ gap: 4 }}>
                      <button type="button" className="wr-link" disabled={browseLoading || browse.page <= 1}
                        onClick={() => void loadBrowse(browse.page - 1)}>‹ Prev</button>
                      <span style={{ fontSize: 12, color: '#7A6F65' }}>Page {browse.page} of {browse.totalPages}</span>
                      <button type="button" className="wr-link" disabled={browseLoading || browse.page >= browse.totalPages}
                        onClick={() => void loadBrowse(browse.page + 1)}>Next ›</button>
                    </div>
                    <button type="button" className="wr-btn" disabled={picked.size === 0} onClick={addPicked}>
                      Add {picked.size || ''} selected
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Print list */}
        <div className="wr-panel">
          <div className="wr-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <p className="wr-panel-title" style={{ margin: 0 }}>
              Print list <span className="wr-count">{certs.length}</span>
            </p>
            <div className="wr-row">
              <button type="button" className="wr-link wr-link-danger" disabled={certs.length === 0}
                onClick={() => { setCerts([]); setActiveKey(null); }}>Clear</button>
              <button type="button" className="wr-btn-ghost" disabled={!ready} onClick={() => window.print()}>
                Print{certs.length > 1 ? ` all (${certs.length})` : ''}
              </button>
              <button type="button" className="wr-btn" disabled={!ready || !scriptsReady || progress !== null}
                onClick={() => void downloadPDF()}>
                {progress ?? 'Download PDF'}
              </button>
            </div>
          </div>

          {certs.length === 0 ? (
            <p className="wr-empty">No orders yet. Add order numbers above or pick from completed orders.</p>
          ) : (
            <div className="wr-items">
              {certs.map(c => (
                <div key={c.orderNumber} className={`wr-item${c.orderNumber === activeKey ? ' active' : ''}`}>
                  <div className="wr-item-main">
                    <div className="wr-item-title">
                      #{c.orderNumber} · {c.customer || 'No name'}
                      {c.status === 'cancelled' && <span className="wr-badge wr-badge-danger">cancelled</span>}
                      {!isComplete(c) && <span className="wr-badge wr-badge-danger">missing info</span>}
                    </div>
                    <div className="wr-item-sub">
                      {fmtCertDate(c.startDate)} → {fmtCertDate(validUntil(c.startDate))} · {c.product.split('\n').join(', ')}
                    </div>
                  </div>
                  <button type="button" className="wr-link"
                    onClick={() => setActiveKey(c.orderNumber === activeKey ? null : c.orderNumber)}>
                    {c.orderNumber === activeKey ? 'Done' : 'Edit'}
                  </button>
                  <button type="button" className="wr-link wr-link-danger" onClick={() => removeCert(c.orderNumber)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {incomplete.length > 0 && (
            <p className="wr-note wr-warn">
              Fill in the missing details on {incomplete.map(c => `#${c.orderNumber}`).join(', ')} before printing.
            </p>
          )}

          {active && (
            <div className="wr-grid">
              <div className="wr-field">
                <label>Customer name</label>
                <input className="wr-input" value={active.customer}
                  onChange={e => updateCert(active.orderNumber, { customer: e.target.value })} />
              </div>
              <div className="wr-field">
                <label>Product (one per line)</label>
                <textarea className="wr-input" rows={Math.max(1, active.product.split('\n').length)} value={active.product}
                  onChange={e => updateCert(active.orderNumber, { product: e.target.value })} />
              </div>
              <div className="wr-field">
                <label>Qty (one per line)</label>
                <textarea className="wr-input" rows={Math.max(1, active.qty.split('\n').length)} value={active.qty}
                  onChange={e => updateCert(active.orderNumber, { qty: e.target.value })} />
              </div>
              <div className="wr-field">
                <label>Order date (start)</label>
                <input type="date" className="wr-input" value={active.startDate}
                  onChange={e => updateCert(active.orderNumber, { startDate: e.target.value })} />
              </div>
              <div className="wr-field">
                <label>Valid until ({GUARANTEE_YEARS} yrs + {FULFILMENT_TOLERANCE_MONTHS} mo)</label>
                <input className="wr-input" value={fmtCertDate(validUntil(active.startDate))} readOnly />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="wr-preview" ref={previewRef}>
        {certs.map(c => <Certificate key={c.orderNumber} c={c} />)}
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
