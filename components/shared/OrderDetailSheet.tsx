'use client';

import { useState } from 'react';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';

export interface OrderSheetRow {
  o: PipelineOrder;
  item: PipelineLineItem;
}

interface Props {
  title?: string;
  rows?: OrderSheetRow[];
  order?: PipelineOrder;   // direct single-order mode — skips the list
  onClose: () => void;
  onBack?: () => void;
}

/** e.g. "04 Nov 2026, 14:05" in Cairo time. */
function fmtCancelTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtPrice(n: number) {
  return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
}

export default function OrderDetailSheet({ title, rows, order, onClose, onBack }: Props) {
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);

  const isDirectMode = !!order;
  const detailOrder: PipelineOrder | null =
    order ?? (detailOrderId != null ? (rows?.find(r => r.o.id === detailOrderId)?.o ?? null) : null);

  const showBack = isDirectMode ? !!onBack : !!(detailOrder || onBack);
  const handleBack = isDirectMode
    ? () => onBack?.()
    : () => (detailOrder ? setDetailOrderId(null) : onBack?.());

  return (
    <>
      <style>{`
        .od-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:400; display:flex; align-items:flex-start; justify-content:center; padding:20px; overflow-y:auto; }
        .od-box { background:#fff; border-radius:14px; width:100%; max-width:480px; overflow:hidden; margin:auto; }
        .od-header { background:#7A4610; color:#fff; padding:12px 16px; display:flex; align-items:center; gap:10px; }
        .od-title { font-size:13px; font-weight:700; flex:1; }
        .od-back { background:none; border:none; color:#fff; font-size:16px; font-weight:700; cursor:pointer; padding:0 4px; line-height:1; }
        .od-close { background:none; border:none; color:#fff; font-size:18px; cursor:pointer; padding:0 2px; }
        .od-body { max-height:70vh; overflow-y:auto; }
        .od-order-row { display:flex; align-items:center; gap:8px; padding:9px 16px; border-bottom:1px solid #f0e8e0; cursor:pointer; }
        .od-order-row:hover { background:#fdf8f4; }
        .od-order-row:last-child { border-bottom:none; }
        .od-order-num { font-size:11px; font-weight:700; color:#7A4610; flex-shrink:0; }
        .od-order-name { font-size:12px; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .od-order-qty { font-size:11px; color:#888; flex-shrink:0; }
        .od-order-val { font-size:11px; font-weight:700; color:#7A4610; flex-shrink:0; }
        .od-order-days { font-size:10px; color:#bbb; flex-shrink:0; white-space:nowrap; }
        .od-order-phase { font-size:10px; color:#aaa; flex-shrink:0; max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .od-section { padding:10px 16px; border-bottom:1px solid #f0e8e0; }
        .od-cancel { background:#fdf2f0; }
        .od-cancel-tbl { width:100%; border-collapse:collapse; font-size:13px; }
        .od-cancel-tbl th { text-align:left; width:70px; font-size:11px; font-weight:700; color:#9e9087; padding:3px 0; vertical-align:top; }
        .od-cancel-tbl td { padding:3px 0; color:#1C1A17; }
        .od-cancel-sub { color:#9e9087; font-size:12px; }
        .od-label { font-size:10px; color:#aaa; font-weight:700; text-transform:uppercase; letter-spacing:.4px; margin-bottom:4px; }
        .od-val { font-size:12px; color:#333; margin-bottom:2px; }
        .od-contact { display:flex; gap:8px; margin-top:6px; }
        .od-contact-btn { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; border-radius:20px; padding:4px 12px; text-decoration:none; border:none; cursor:pointer; flex-shrink:0; }
        .od-contact-btn.wa { background:#25D366; color:#fff; }
        .od-contact-btn.call { background:#f0e8e0; color:#7A4610; }
        .od-table { width:100%; border-collapse:collapse; font-size:11px; }
        .od-table th { text-align:left; color:#aaa; font-weight:700; font-size:10px; text-transform:uppercase; padding:4px 6px; border-bottom:1px solid #f0e8e0; }
        .od-table td { padding:5px 6px; border-bottom:1px solid #f8f4f0; vertical-align:top; }
        .od-table tr:last-child td { border-bottom:none; }
        .od-total { display:flex; justify-content:space-between; padding:10px 16px; background:#fef3e2; font-size:13px; font-weight:700; color:#7A4610; }
        .od-empty { padding:20px; text-align:center; color:#aaa; font-size:13px; }
      `}</style>

      <div className="od-overlay" onClick={onClose}>
        <div className="od-box" onClick={e => e.stopPropagation()}>
          <div className="od-header">
            {showBack && <button className="od-back" onClick={handleBack}>←</button>}
            <span className="od-title">
              {detailOrder ? `${detailOrder.number} · ${detailOrder.customerName}` : (title ?? '')}
            </span>
            <button className="od-close" onClick={onClose}>✕</button>
          </div>

          {detailOrder ? (
            <div className="od-body">
              <div className="od-section">
                <div className="od-label">Customer</div>
                <div className="od-val">{detailOrder.customerName}</div>
                {detailOrder.customerPhone && (
                  <>
                    <div className="od-val">{detailOrder.customerPhone}</div>
                    <div className="od-contact">
                      <a className="od-contact-btn wa"
                        href={`https://wa.me/${detailOrder.customerPhone.replace(/\D/g, '')}`}
                        target="_blank" rel="noreferrer">WA</a>
                      <a className="od-contact-btn call"
                        href={`tel:${detailOrder.customerPhone.replace(/\D/g, '')}`}>Call</a>
                    </div>
                  </>
                )}
                {detailOrder.customerAddress && (
                  <div className="od-val" style={{ marginTop: 4 }}>
                    {[detailOrder.customerAddress, detailOrder.customerAddress2, detailOrder.customerState]
                      .filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              {(detailOrder.cancelledAt || detailOrder.cancelReason) && (
                <div className="od-section od-cancel">
                  <div className="od-label" style={{ color: '#c0392b' }}>Cancellation</div>
                  <table className="od-cancel-tbl">
                    <tbody>
                      {detailOrder.cancelledAt && (
                        <tr><th>Time</th><td>
                          {fmtCancelTime(detailOrder.cancelledAt)}
                          {detailOrder.daysToCancel != null && (
                            <span className="od-cancel-sub"> · {detailOrder.daysToCancel === 0 ? 'same day as ordered' : `${detailOrder.daysToCancel}d after ordering`}</span>
                          )}
                        </td></tr>
                      )}
                      <tr><th>Reason</th><td>{detailOrder.cancelReason || '—'}</td></tr>
                      <tr><th>Timing</th><td>{detailOrder.cancelTiming || '—'}</td></tr>
                      <tr><th>Impact</th><td>{detailOrder.cancelImpact || '—'}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
              {detailOrder.customerNote && (
                <div className="od-section">
                  <div className="od-label">Note</div>
                  <div className="od-val">{detailOrder.customerNote}</div>
                </div>
              )}
              <div className="od-section">
                <div className="od-label">Items</div>
                <table className="od-table">
                  <thead><tr><th>Item</th><th>Qty</th><th>Total</th><th>Phase</th></tr></thead>
                  <tbody>
                    {detailOrder.lineItems.map(li => (
                      <tr key={li.id}>
                        <td>{li.name}</td>
                        <td>×{li.quantity}</td>
                        <td>{fmtPrice(li.total)}</td>
                        <td style={{ color: '#aaa', fontSize: 11 }}>{li.phase || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="od-total">
                <span>Total</span><span>{fmtPrice(detailOrder.total)} EGP</span>
              </div>
            </div>
          ) : (
            <div className="od-body">
              {(rows ?? []).length === 0
                ? <div className="od-empty">No orders found</div>
                : (rows ?? []).map(({ o, item }) => (
                    <div key={o.id} className="od-order-row" onClick={() => setDetailOrderId(o.id)}>
                      <span className="od-order-num">{o.number}</span>
                      <span className="od-order-name">{o.customerName}</span>
                      <span className="od-order-qty">×{item.quantity}</span>
                      <span className="od-order-val">{fmtPrice(item.total)} EGP</span>
                      <span className="od-order-days">{o.daysOpen}d</span>
                      <span className="od-order-phase">{item.phase}</span>
                    </div>
                  ))
              }
            </div>
          )}
        </div>
      </div>
    </>
  );
}
