'use client';

import { useCsOrders } from './csShared';
import CsOrderRow from './CsOrderRow';

// Orders with at least one line item that has sat in its current production
// phase longer than that phase's expected_days (set on /owner/phases).
export default function DelayFlagsTab() {
  const { orders, loadState, errMsg, reload } = useCsOrders();
  const delayed = orders.filter(o => o.isDelayed);

  return (
    <div>
      <p style={{ fontSize: 12, color: '#999', margin: '0 0 12px' }}>
        Set an expected-days threshold per phase on the Phases page to control what counts as delayed here.
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
