'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PipelineOrder } from '@/app/api/pipeline/orders/route';
import { fmtPrice } from '@/components/shared/PipelineOrderCard';

export interface CancellationReason {
  id: string;
  label: string;
  sort_order: number;
}

/** What the user picked for one order. Labels come from the Supabase lists. */
export interface CancelChoice {
  reason: string;
  timing: string;
  impact: string;
}

interface Props {
  open: boolean;
  orders: PipelineOrder[];
  reasons: CancellationReason[];
  timings: CancellationReason[];
  impacts: CancellationReason[];
  submitting?: boolean;
  /** orderId → reason, timing and impact, one entry per order. */
  onConfirm: (choiceByOrder: Record<number, CancelChoice>) => void;
  onClose: () => void;
}

const EMPTY: CancelChoice = { reason: '', timing: '', impact: '' };

function orderQty(o: PipelineOrder) {
  return o.lineItems.reduce((sum, li) => sum + (li.quantity ?? 0), 0);
}

export default function CancelOrdersModal({
  open, orders, reasons, timings, impacts, submitting = false, onConfirm, onClose,
}: Props) {
  const [choiceByOrder, setChoiceByOrder] = useState<Record<number, CancelChoice>>({});
  const choiceOf = (id: number) => choiceByOrder[id] ?? EMPTY;
  const setChoice = (id: number, field: keyof CancelChoice, value: string) =>
    setChoiceByOrder(prev => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY), [field]: value } }));

  // Reset selections whenever the modal opens with a new batch.
  useEffect(() => {
    if (open) setChoiceByOrder({});
  }, [open, orders]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  const totals = useMemo(() => {
    let qty = 0, value = 0;
    orders.forEach(o => { qty += orderQty(o); value += o.total ?? 0; });
    return { qty, value };
  }, [orders]);

  const allChosen = orders.length > 0 && orders.every(o => {
    const c = choiceOf(o.id);
    return c.reason && c.timing && c.impact;
  });

  if (!open) return null;

  return (
    <div
      className="com-overlay"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className="com-modal">
        <div className="com-head">
          <span className="com-title">Cancel {orders.length} order{orders.length === 1 ? '' : 's'}</span>
          <button className="com-x" onClick={onClose} disabled={submitting}>✕</button>
        </div>

        <div className="com-body">
          {orders.map(o => (
            <div className="com-row" key={o.id}>
              <div className="com-row-info">
                <span className="com-row-num">#{o.number}</span>
                <span className="com-row-cust">{o.customerName || '—'}</span>
                <span className="com-row-meta">{orderQty(o)} pcs · {fmtPrice(o.total)} EGP</span>
              </div>
              <div className="com-selects">
                {([
                  ['reason', 'Reason', reasons],
                  ['timing', 'Timing', timings],
                  ['impact', 'Impact', impacts],
                ] as const).map(([field, label, list]) => (
                  <select
                    key={field}
                    className={`com-reason${choiceOf(o.id)[field] ? '' : ' empty'}`}
                    value={choiceOf(o.id)[field]}
                    disabled={submitting}
                    onChange={e => setChoice(o.id, field, e.target.value)}
                  >
                    <option value="" disabled>{label}…</option>
                    {list.map(r => (
                      <option key={r.id} value={r.label}>{r.label}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="com-totals">
          <div className="com-total-kpi">
            <span className="com-total-label">Total qty</span>
            <span className="com-total-value">{totals.qty} pcs</span>
          </div>
          <div className="com-total-kpi">
            <span className="com-total-label">Total value</span>
            <span className="com-total-value">{fmtPrice(totals.value)} EGP</span>
          </div>
        </div>

        <div className="com-actions">
          <button className="com-btn no" onClick={onClose} disabled={submitting}>No</button>
          <button
            className="com-btn yes"
            disabled={!allChosen || submitting}
            onClick={() => onConfirm(choiceByOrder)}
          >
            {submitting ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .com-overlay {
          position: fixed; inset: 0; z-index: 60;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.45); padding: 16px;
        }
        .com-modal {
          background: #fff; border-radius: 16px; width: 100%; max-width: 460px;
          max-height: 86vh; display: flex; flex-direction: column;
          box-shadow: 0 18px 50px rgba(0,0,0,0.25); overflow: hidden;
        }
        .com-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 18px; border-bottom: 1px solid #f0e9e1;
        }
        .com-title { font-weight: 700; color: #c0392b; font-size: 15px; }
        .com-x {
          border: none; background: transparent; cursor: pointer;
          font-size: 15px; color: #999; line-height: 1;
        }
        .com-x:disabled { opacity: 0.4; cursor: default; }
        .com-body { padding: 6px 18px; overflow-y: auto; }
        .com-row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 12px 0; border-bottom: 1px solid #f6f1ea;
        }
        .com-row:last-child { border-bottom: none; }
        .com-row-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .com-row-num { font-weight: 700; color: #7A4610; font-size: 13px; }
        .com-row-cust {
          font-size: 12px; color: #444; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; max-width: 180px;
        }
        .com-row-meta { font-size: 11px; color: #999; }
        .com-selects { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
        .com-reason {
          flex-shrink: 0; min-width: 150px; padding: 7px 9px; border-radius: 8px;
          border: 1px solid #ddd; background: #fff; font-size: 12px; color: #333;
          cursor: pointer;
        }
        .com-reason.empty { border-color: #f1a9a0; color: #c0392b; }
        .com-reason:disabled { opacity: 0.6; cursor: default; }
        .com-totals {
          display: flex; gap: 12px; padding: 12px 18px;
          background: #fdf6f5; border-top: 1px solid #f0e9e1;
        }
        .com-total-kpi { display: flex; flex-direction: column; gap: 2px; }
        .com-total-label { font-size: 11px; color: #b07; color: #c0392b; }
        .com-total-value { font-weight: 700; color: #7A4610; font-size: 14px; }
        .com-actions {
          display: flex; gap: 10px; padding: 14px 18px;
          border-top: 1px solid #f0e9e1;
        }
        .com-btn {
          flex: 1; padding: 11px; border-radius: 10px; border: 1px solid transparent;
          font-weight: 700; font-size: 13px; cursor: pointer;
        }
        .com-btn.no { background: #fff; border-color: #ddd; color: #555; }
        .com-btn.yes { background: #c0392b; color: #fff; }
        .com-btn.yes:disabled { background: #e3a9a2; cursor: default; }
        .com-btn:disabled { cursor: default; }
      `}</style>
    </div>
  );
}
