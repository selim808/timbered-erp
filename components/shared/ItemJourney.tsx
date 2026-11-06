'use client';

import { useEffect, useState } from 'react';
import type { OrderJourneyResponse } from '@/app/api/orders/[id]/journey/route';

// Journeys are fetched per order and kept for the visit, so reopening is instant.
const cache = new Map<string, Promise<OrderJourneyResponse>>();

function loadJourney(orderNumber: string): Promise<OrderJourneyResponse> {
  let p = cache.get(orderNumber);
  if (!p) {
    p = fetch(`/api/orders/${encodeURIComponent(orderNumber)}/journey`)
      .then(r => r.json())
      .then((d: OrderJourneyResponse & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        return d;
      });
    p.catch(() => cache.delete(orderNumber)); // let a failed load be retried
    cache.set(orderNumber, p);
  }
  return p;
}

/** e.g. "04 Nov, 14:05" in Cairo time. */
function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Cairo', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/** 45m · 5h · 3d 4h */
function fmtSpan(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const d = Math.floor(hours / 24), h = hours % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
}

interface Props {
  orderNumber: string;
  item: { id: number; name: string; quantity: number; phase: string };
  onClose: () => void;
}

/** One item's path through the kanban phases, oldest step first, with time spent in each. */
export default function ItemJourney({ orderNumber, item, onClose }: Props) {
  const [data, setData] = useState<OrderJourneyResponse | null>(null);
  // "Now" for the open-ended current step, taken when the journey loads.
  const [now, setNow] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    loadJourney(orderNumber)
      .then(d => { if (live) { setNow(Date.now()); setData(d); } })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [orderNumber]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const journey = data?.items[String(item.id)];
  const steps = journey?.steps ?? [];
  const first = steps[0] ? new Date(steps[0].at).getTime() : null;

  return (
    <div className="ij-overlay" onClick={e => { e.stopPropagation(); onClose(); }}>
      <style>{`
        .ij-overlay { position:fixed; inset:0; z-index:1150; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; padding:16px; }
        .ij-box { background:#fff; border-radius:14px; width:100%; max-width:440px; max-height:85vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,.3); }
        .ij-head { background:#7A4610; color:#fff; padding:12px 16px; display:flex; align-items:flex-start; gap:10px; }
        .ij-title { flex:1; min-width:0; }
        .ij-title b { display:block; font-size:15px; }
        .ij-title span { font-size:11px; opacity:.85; }
        .ij-close { background:none; border:none; color:#fff; font-size:22px; line-height:1; cursor:pointer; padding:0 2px; }
        .ij-sum { display:flex; gap:8px; flex-wrap:wrap; padding:10px 16px; border-bottom:1px solid #f0e8e0; font-size:12px; color:#7A6F65; }
        .ij-sum b { color:#1C1A17; }
        .ij-body { overflow-y:auto; padding:12px 16px 16px; }
        .ij-step { position:relative; padding:0 0 16px 24px; }
        .ij-step::before { content:''; position:absolute; left:6px; top:14px; bottom:0; width:2px; background:#E8D9C4; }
        .ij-step:last-child::before { display:none; }
        .ij-dot { position:absolute; left:0; top:3px; width:14px; height:14px; border-radius:50%; background:#fff; border:3px solid #C8AA88; box-sizing:border-box; }
        .ij-step.current .ij-dot { background:#7A4610; border-color:#7A4610; box-shadow:0 0 0 4px #fef3e2; }
        .ij-phase { font-size:14px; font-weight:700; color:#1C1A17; }
        .ij-step.current .ij-phase { color:#7A4610; }
        .ij-meta { font-size:11px; color:#9e9087; margin-top:2px; }
        .ij-src { display:inline-block; font-size:10px; font-weight:700; color:#7A4610; background:#fef3e2; border-radius:8px; padding:0 6px; margin-left:4px; }
        .ij-span { display:inline-block; margin-top:4px; font-size:11px; font-weight:700; color:#1C1A17; background:#FBF5EC; border:1px solid #E8D9C4; border-radius:10px; padding:1px 8px; }
        .ij-empty { text-align:center; color:#9e9087; font-size:13px; padding:20px 0; }
      `}</style>
      <div className="ij-box" onClick={e => e.stopPropagation()}>
        <div className="ij-head">
          <div className="ij-title">
            <b>{item.name}</b>
            <span>Order {orderNumber} · ×{item.quantity} · now in {journey?.phase || item.phase || '—'}</span>
          </div>
          <button className="ij-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error ? (
          <div className="ij-empty" style={{ color: '#c0392b' }}>Couldn&apos;t load the journey — {error}</div>
        ) : !data ? (
          <div className="ij-empty">Loading journey…</div>
        ) : steps.length === 0 ? (
          <div className="ij-empty">No phase history recorded for this item yet.</div>
        ) : (
          <>
            <div className="ij-sum">
              <span>Placed <b>{fmtWhen(data.placedAt)}</b></span>
              <span>· <b>{steps.length}</b> step{steps.length === 1 ? '' : 's'}</span>
              {first !== null && <span>· in pipeline <b>{fmtSpan(now - Math.min(first, new Date(data.placedAt).getTime()))}</b></span>}
            </div>
            <div className="ij-body">
              {steps.map((s, i) => {
                const start = new Date(s.at).getTime();
                const isLast = i === steps.length - 1;
                const end = isLast ? now : new Date(steps[i + 1].at).getTime();
                return (
                  <div key={`${s.at}-${i}`} className={`ij-step${isLast ? ' current' : ''}`}>
                    <span className="ij-dot" />
                    <div className="ij-phase">{s.phase}</div>
                    <div className="ij-meta">
                      {fmtWhen(s.at)}
                      {s.source && <span className="ij-src">{s.source}</span>}
                    </div>
                    <span className="ij-span">{isLast ? `${fmtSpan(end - start)} so far` : `${fmtSpan(end - start)} here`}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
