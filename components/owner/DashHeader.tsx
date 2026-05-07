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
    <header className="sticky top-0 z-40 bg-gold flex items-center px-4 h-16 gap-3">
      {/* Logo */}
      <form action={ownerLogout} className="flex-shrink-0">
        <button title="Exit">
          <Image src={LOGO} alt="Timbered" width={44} height={44} className="object-contain rounded-lg" />
        </button>
      </form>

      {/* Title */}
      <div className="flex-1 text-center">
        <p className="font-sans font-black text-brown text-base tracking-widest leading-none">TIMBERED</p>
        <p className="font-sans text-[10px] font-semibold text-brown-mid tracking-widest">DASHBOARD</p>
      </div>

      {/* Date */}
      <div className="flex-shrink-0 bg-surface border border-border-strong rounded-full px-3 py-1">
        <p className="text-[11px] font-semibold text-brown">{date}</p>
      </div>
    </header>
  );
}
