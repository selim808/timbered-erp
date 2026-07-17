'use client';

import { useState } from 'react';
import CancelledOrdersTab from '@/components/owner/CancelledOrdersTab';
import { CS_CSS } from '@/components/owner/cs/csShared';
import CallQueueTab from '@/components/owner/cs/CallQueueTab';
import DelayFlagsTab from '@/components/owner/cs/DelayFlagsTab';
import PostDeliveryIssuesTab from '@/components/owner/cs/PostDeliveryIssuesTab';
import ReviewFollowupTab from '@/components/owner/cs/ReviewFollowupTab';
import ReturnsTab from '@/components/owner/cs/ReturnsTab';
import IssueFlagsTab from '@/components/owner/cs/IssueFlagsTab';
import FaqTab from '@/components/owner/cs/FaqTab';
import UpsellTab from '@/components/owner/cs/UpsellTab';

const TABS = [
  { key: 'queue', label: 'Call Queue' },
  { key: 'delay', label: 'Delay Flags' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'issues', label: 'Post-Delivery Issues' },
  { key: 'followup', label: 'Review Follow-up' },
  { key: 'returns', label: 'Returns/Exchanges' },
  { key: 'flags', label: 'Issue Flags' },
  { key: 'faq', label: 'FAQ / Script' },
  { key: 'upsell', label: 'Upsell' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function CustomerServicePage() {
  const [tab, setTab] = useState<TabKey>('queue');

  return (
    <>
      <style>{CS_CSS}</style>

      <div className="cs-tabbar">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`cs-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="cs-body">
        {tab === 'queue' && <CallQueueTab />}
        {tab === 'delay' && <DelayFlagsTab />}
        {tab === 'cancellations' && <CancelledOrdersTab />}
        {tab === 'issues' && <PostDeliveryIssuesTab />}
        {tab === 'followup' && <ReviewFollowupTab />}
        {tab === 'returns' && <ReturnsTab />}
        {tab === 'flags' && <IssueFlagsTab />}
        {tab === 'faq' && <FaqTab />}
        {tab === 'upsell' && <UpsellTab />}
      </div>
    </>
  );
}
