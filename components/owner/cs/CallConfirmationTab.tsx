'use client';

import { useCsOrders, useCsPager } from './csShared';
import CsOrderRow from './CsOrderRow';

// Orders still waiting on the confirmation call. Once the customer picks up
// and confirms, the order leaves this list for Deposit; if nobody answers it
// moves to the No response tab.
const CONFIRM_STATUSES = new Set(['new', 'called', 'confirmed']);

export default function CallConfirmationTab() {
  const { orders, loadState, errMsg, reload } = useCsOrders();
  const queue = orders.filter(o => CONFIRM_STATUSES.has(o.csStatus));
  const { pageItems, currentPage, totalPages, setPage } = useCsPager(queue);

  return (
    <div>
      <p className="cs-hint">
        Call each customer to confirm the order. Unanswered calls move to No response.
      </p>
      {loadState === 'loading' && <div className="cs-state">Loading call list…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load: {errMsg}</div>}
      {loadState === 'done' && queue.length === 0 && <div className="cs-state">No orders waiting on a confirmation call.</div>}
      {loadState === 'done' && queue.length > 0 && (
        <>
          <div className="cs-list">
            {pageItems.map(o => <CsOrderRow key={o.id} order={o} mode="confirm" onChanged={reload} />)}
          </div>
          {totalPages > 1 && (
            <div className="cs-pager">
              <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>← Prev</button>
              <span>Page {currentPage} of {totalPages} · {queue.length} to call</span>
              <button disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
