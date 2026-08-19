'use client';

import { useState } from 'react';
import { useCsOrders, useCsPager } from './csShared';
import CsOrderRow from './CsOrderRow';

// Orders in the deposit stage: anything explicitly parked on a deposit status,
// plus any confirmed order a rep has marked as needing one.
const DEPOSIT_STATUSES = new Set(['deposit_pending', 'deposit_paid']);

export default function DepositTab() {
  const { orders, loadState, errMsg, reload } = useCsOrders();
  const [hidePaid, setHidePaid] = useState(false);

  const deposits = orders
    .filter(o => DEPOSIT_STATUSES.has(o.csStatus) || o.depositRequired)
    .filter(o => !hidePaid || !o.depositPaidAt);
  const outstanding = deposits.filter(o => !o.depositPaidAt).length;
  const { pageItems, currentPage, totalPages, setPage } = useCsPager(deposits);

  return (
    <div>
      <p className="cs-hint">
        Deposit collection. An order appears here once it is on a deposit status or a rep ticks
        &quot;Deposit required&quot; during the confirmation call.
      </p>

      <label className="cs-check" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={hidePaid} onChange={e => setHidePaid(e.target.checked)} />
        &nbsp;Only show deposits still outstanding
      </label>

      {loadState === 'loading' && <div className="cs-state">Loading deposits…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load: {errMsg}</div>}
      {loadState === 'done' && deposits.length === 0 && <div className="cs-state">No orders waiting on a deposit.</div>}
      {loadState === 'done' && deposits.length > 0 && (
        <>
          <div className="cs-list">
            {pageItems.map(o => <CsOrderRow key={o.id} order={o} mode="deposit" onChanged={reload} />)}
          </div>
          {totalPages > 1 && (
            <div className="cs-pager">
              <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>← Prev</button>
              <span>Page {currentPage} of {totalPages} · {outstanding} outstanding</span>
              <button disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
