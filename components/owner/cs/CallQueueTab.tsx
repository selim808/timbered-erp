'use client';

import { useCsOrders } from './csShared';
import CsOrderRow from './CsOrderRow';

const QUEUE_STATUSES = new Set(['new', 'called', 'confirmed', 'deposit_pending', 'deposit_paid']);

// Orders that still need a CS action before production: confirm by phone,
// collect a deposit, offer an upsell.
export default function CallQueueTab() {
  const { orders, loadState, errMsg, reload } = useCsOrders();
  const queue = orders.filter(o => QUEUE_STATUSES.has(o.csStatus));

  return (
    <div>
      {loadState === 'loading' && <div className="cs-state">Loading call queue…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load: {errMsg}</div>}
      {loadState === 'done' && queue.length === 0 && <div className="cs-state">Call queue is empty — every processing order has been confirmed.</div>}
      {loadState === 'done' && queue.length > 0 && (
        <div className="cs-list">
          {queue.map(o => <CsOrderRow key={o.id} order={o} mode="queue" onChanged={reload} />)}
        </div>
      )}
    </div>
  );
}
