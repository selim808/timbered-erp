'use client';

import { useState } from 'react';
import { CS_CSS } from '@/components/owner/cs/csShared';
import CallConfirmationTab from '@/components/owner/cs/CallConfirmationTab';
import DepositTab from '@/components/owner/cs/DepositTab';
import DelayNoticeTab from '@/components/owner/cs/DelayNoticeTab';
import NoResponseTab from '@/components/owner/cs/NoResponseTab';
import FollowUpTab from '@/components/owner/cs/FollowUpTab';
import ReturnsTab from '@/components/owner/cs/ReturnsTab';
import TicketsTab from '@/components/owner/cs/TicketsTab';

const TABS = [
  { key: 'confirmation', label: 'Call confirmation' },
  { key: 'deposit', label: 'Deposit' },
  { key: 'delay', label: 'Delay Notice' },
  { key: 'noresponse', label: 'No response' },
  { key: 'followup', label: 'Follow up' },
  { key: 'returns', label: 'Returns' },
  { key: 'tickets', label: 'Tickets' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function CustomerServicePage() {
  const [tab, setTab] = useState<TabKey>('confirmation');

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
        {tab === 'confirmation' && <CallConfirmationTab />}
        {tab === 'deposit' && <DepositTab />}
        {tab === 'delay' && <DelayNoticeTab />}
        {tab === 'noresponse' && <NoResponseTab />}
        {tab === 'followup' && <FollowUpTab />}
        {tab === 'returns' && <ReturnsTab />}
        {tab === 'tickets' && <TicketsTab />}
      </div>
    </>
  );
}
