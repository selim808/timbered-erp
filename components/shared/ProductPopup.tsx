'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';
import OrderDetailSheet from '@/components/shared/OrderDetailSheet';
import { fmtPrice } from '@/components/shared/PipelineOrderCard';

const STYLES = `
  .ppop-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:400; display:flex; align-items:flex-start; justify-content:center; padding:20px; overflow-y:auto; }
  .ppop-box { background:#fff; border-radius:14px; width:100%; max-width:480px; overflow:hidden; margin:auto; }
  .ppop-header { background:#7A4610; color:#fff; padding:12px 16px; display:flex; align-items:center; gap:10px; }
  .ppop-title { font-size:13px; font-weight:700; flex:1; }
  .ppop-close { background:none; border:none; color:#fff; font-size:18px; cursor:pointer; padding:0 2px; line-height:1; }
  .ppop-section { padding:10px 16px; border-bottom:1px solid #f0e8e0; }
  .ppop-val { font-size:12px; color:#333; margin-bottom:2px; }
`;

// ── Product Popup ──────────────────────────────────────────────────────────
// Image-click popup: product info → orders list → order detail (3 levels).

export default function ProductPopup({ li, orders, onClose }: {
  li: PipelineLineItem; orders: PipelineOrder[]; onClose: () => void;
}) {
  const [details, setDetails] = useState<{ dim: string; material: string; imageUrl: string } | null>(null);
  const [showOrders, setShowOrders] = useState(false);

  useEffect(() => {
    fetch(`/api/pipeline/product/${li.productId}`)
      .then(r => r.json())
      .then(d => setDetails(d))
      .catch(() => setDetails({ dim: '', material: '', imageUrl: '' }));
  }, [li.productId]);

  const ordersWithProduct = useMemo(() =>
    orders.flatMap(o => {
      const item = o.lineItems.find(i => i.productId === li.productId);
      return item ? [{ o, item }] : [];
    }),
    [orders, li.productId]
  );

  const imgSrc = details?.imageUrl || li.imageUrl;

  if (showOrders) {
    return (
      <OrderDetailSheet
        title={`Orders · ${li.name}`}
        rows={ordersWithProduct}
        onClose={onClose}
        onBack={() => setShowOrders(false)}
      />
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="ppop-overlay" onClick={onClose}>
        <div className="ppop-box" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
          <div className="ppop-header">
            <span className="ppop-title">{li.name}</span>
            <button className="ppop-close" onClick={onClose}>✕</button>
          </div>
          {imgSrc && (
            <img src={imgSrc} alt={li.name}
              style={{ width: '100%', maxHeight: 260, objectFit: 'contain', background: '#f8f4f0', borderBottom: '1px solid #f0e8e0', display: 'block' }} />
          )}
          <div className="ppop-section">
            {details === null
              ? <div style={{ fontSize: 12, color: '#aaa' }}>Loading…</div>
              : <>
                  {details.dim      && <div className="ppop-val" style={{ marginBottom: 4 }}>📐 {details.dim} cm</div>}
                  {details.material && <div className="ppop-val" style={{ marginBottom: 4 }}>🪵 {details.material}</div>}
                </>
            }
            <div className="ppop-val" style={{ marginTop: 8 }}>📦 <strong>{li.stock}</strong> in stock</div>
            <div className="ppop-val" style={{ marginTop: 4, cursor: 'pointer', color: '#e67e22' }}
              onClick={() => setShowOrders(true)}>
              🛒 <strong>{li.orderedQty}</strong> ordered
              <span style={{ fontSize: 11, marginLeft: 6, textDecoration: 'underline' }}>view orders →</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
