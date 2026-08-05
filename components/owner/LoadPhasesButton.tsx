'use client';

import { useState } from 'react';
import { refreshPhaseCache } from '@/lib/phaseCache';

type Status = 'idle' | 'loading' | 'ok' | 'error';

export default function LoadPhasesButton() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleClick() {
    setStatus('loading');
    setMessage('');
    try {
      const { groups, phases } = await refreshPhaseCache();
      setStatus('ok');
      setMessage(`Updated — ${groups} groups, ${phases} phases`);
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Failed to load phases');
    }
  }

  const color =
    status === 'ok' ? '#16A34A' : status === 'error' ? '#DC2626' : 'var(--text-muted, #8a7a6a)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        style={{
          padding: '10px 20px',
          borderRadius: 999,
          border: '1px solid #d8c9b8',
          background: status === 'loading' ? '#efe6da' : '#fff',
          color: '#6b4f34',
          fontSize: 13,
          fontWeight: 600,
          cursor: status === 'loading' ? 'default' : 'pointer',
        }}
      >
        {status === 'loading' ? 'Loading…' : '↻ Load new phases'}
      </button>
      {message && <span style={{ fontSize: 12, color }}>{message}</span>}
    </div>
  );
}
