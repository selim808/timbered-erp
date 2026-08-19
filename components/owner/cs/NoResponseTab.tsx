'use client';

import { useCsOrders, useCsPager } from './csShared';
import CsOrderRow from './CsOrderRow';

// Orders where the confirmation call went unanswered. Sorted by fewest
// attempts first so the ones barely chased get tried again before the ones
// that have already been called five times.
export default function NoResponseTab() {
  const { orders, loadState, errMsg, reload } = useCsOrders();
  const unreached = orders
    .filter(o => o.csStatus === 'no_response')
    .sort((a, b) => a.callAttempts - b.callAttempts);
  const { pageItems, currentPage, totalPages, setPage } = useCsPager(unreached);

  return (
    <div>
      <p className="cs-hint">
        Customers who did not answer the confirmation call. Try again, or cancel once you have
        chased enough times.
      </p>
      {loadState === 'loading' && <div className="cs-state">Loading…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load: {errMsg}</div>}
      {loadState === 'done' && unreached.length === 0 && <div className="cs-state">Every customer called has responded.</div>}
      {loadState === 'done' && unreached.length > 0 && (
        <>
          <div className="cs-list">
            {pageItems.map(o => <CsOrderRow key={o.id} order={o} mode="noresponse" onChanged={reload} />)}
          </div>
          {totalPages > 1 && (
            <div className="cs-pager">
              <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>← Prev</button>
              <span>Page {currentPage} of {totalPages} · {unreached.length} unreached</span>
              <button disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
