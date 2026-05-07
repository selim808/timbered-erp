'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ownerLogout } from '@/app/actions/auth';

const LOGO = 'https://timberedgroup.com/wp-content/uploads/2024/04/Asset-14.png';

export default function DashHeader() {
  const [date, setDate] = useState('');

  useEffect(() => {
    function fmt() {
      setDate(new Date().toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      }));
    }
    fmt();
    const t = setInterval(fmt, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header style={{
      background: '#F0AE66',
      borderBottom: '2.5px solid #1C1A17',
      height: 64,
      padding: '0 16px',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 200,
    }}>
      {/* Left — logo (click to exit) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <form action={ownerLogout}>
          <button title="Exit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Image
              src={LOGO} alt="Timbered" width={44} height={44}
              style={{ background: '#fff', borderRadius: 4, padding: 1, objectFit: 'contain', display: 'block' }}
            />
          </button>
        </form>
      </div>

      {/* Center — title */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 19, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color: '#1C1A17', lineHeight: 1.1 }}>
          Timbered
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: '#7A4610' }}>
          Dashboard
        </span>
      </div>

      {/* Right — date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{
          fontSize: 12, color: '#7A4610',
          background: 'rgba(255,255,255,0.45)',
          border: '1px solid #B86E1A',
          borderRadius: 20, padding: '3px 10px',
          whiteSpace: 'nowrap',
        }}>
          {date}
        </span>
      </div>
    </header>
  );
}
