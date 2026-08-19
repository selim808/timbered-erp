'use client';

import { useCsOrders } from './csShared';
import CsOrderRow from './CsOrderRow';

// Orders with at least one line item that has sat in its current production
// phase longer than that phase's expected_days (set on /owner/phases) — these
// are the customers who need a proactive delay notice.
export default function DelayNoticeTab() {
  const { orders, loadState, errMsg, reload } = useCsOrders();
  const delayed = orders.filter(o => o.isDelayed);
  const notified = delayed.filter(o => o.csStatus === 'delayed').length;

  return (
    <div>
      <p className="cs-hint">
        Orders past their expected phase duration. Send the notice, then flag the order so the
        rest of the team knows the customer has been told — {notified} of {delayed.length} notified.
        Thresholds come from each phase&apos;s expected-days setting on the Phases page.
      </p>
      {loadState === 'loading' && <div className="cs-state">Checking delay estimates…</div>}
      {loadState === 'error' && <div className="cs-state">Failed to load: {errMsg}</div>}
      {loadState === 'done' && delayed.length === 0 && <div className="cs-state">No orders past their expected phase duration.</div>}
      {loadState === 'done' && delayed.length > 0 && (
        <div className="cs-list">
          {delayed.map(o => <CsOrderRow key={o.id} order={o} mode="delay" onChanged={reload} />)}
        </div>
      )}
    </div>
  );
}
