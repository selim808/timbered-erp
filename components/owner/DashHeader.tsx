'use client';

import { useEffect, useState } from 'react';
import { ownerLogout } from '@/app/actions/auth';

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
    <header className="sticky top-0 z-40 bg-surface border-b-2 border-border h-16 flex items-center px-5 gap-4">
      <div className="flex-1">
        <p className="font-serif text-lg text-brown leading-none">Timbered</p>
        <p className="text-[10px] font-bold text-text-muted tracking-widest uppercase">Dashboard</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-text-muted bg-cream border border-border px-3 py-1 rounded-full hidden sm:block">
          {date}
        </span>
        <form action={ownerLogout}>
          <button className="text-xs text-text-muted hover:text-brown transition-colors">
            Exit
          </button>
        </form>
      </div>
    </header>
  );
}
