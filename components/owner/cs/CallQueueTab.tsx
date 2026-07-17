'use client';

import { useState } from 'react';
import { useCsOrders } from './csShared';
import CsOrderRow from './CsOrderRow';

const QUEUE_STATUSES = new Set(['new', 'called', 'confirmed', 'deposit_pending', 'deposit_paid']);
const PAGE_SIZE = 10;

// Orders that still need a CS action before production: confirm by phone,
// collect a deposit, offer an upsell.
export default function CallQueueTab() {
  const { orders, loadState, errMsg, reload } = useCsOrders();
  const queue = orders.filter(o => QUEUE_STATUSES.has(o.csStatus));

  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(queue.length / PAGE_SIZE));
  // Clamp at render time (not in an effect) so a page that's gone empty —
  // orders left the queue after a status change — falls back immediately.
  const currentPage = Math.min(page, totalPages);

  const pageItems = queue.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      {loadState === 'loading' && <div className="cs-state">Loading call queue…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load: {errMsg}</div>}
      {loadState === 'done' && queue.length === 0 && <div className="cs-state">Call queue is empty — every processing order has been confirmed.</div>}
      {loadState === 'done' && queue.length > 0 && (
        <>
          <div className="cs-list">
            {pageItems.map(o => <CsOrderRow key={o.id} order={o} mode="queue" onChanged={reload} />)}
          </div>
          {totalPages > 1 && (
            <div className="cs-pager">
              <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>← Prev</button>
              <span>Page {currentPage} of {totalPages} · {queue.length} in queue</span>
              <button disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
