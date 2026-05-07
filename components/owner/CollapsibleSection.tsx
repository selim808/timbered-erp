'use client';

import { useState } from 'react';

interface Props {
  index: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const ChevronSVG = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#7A4610" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 5 7 10 12 5" />
  </svg>
);

const LinkSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

export default function CollapsibleSection({ index, title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const isLink = index === '🔗';

  return (
    <div style={{ background: '#fff', border: '1.5px solid #E8D9C4', borderRadius: 18, overflow: 'hidden', animation: 'fadeUp 0.4s ease both' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px', background: '#F4CFA5',
          borderTop: 'none', borderLeft: 'none', borderRight: 'none',
          borderBottom: open ? '1.5px solid #C8AA88' : 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f0c488')}
        onMouseLeave={e => (e.currentTarget.style.background = '#F4CFA5')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            background: '#B86E1A', color: '#fff',
            fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isLink ? <LinkSVG /> : index}
          </span>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, fontWeight: 400, color: '#1C1A17' }}>
            {title}
          </span>
        </div>
        <span style={{ transition: 'transform 0.3s ease', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'flex' }}>
          <ChevronSVG />
        </span>
      </button>

      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.35s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
