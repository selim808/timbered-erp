'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PhaseGroup {
  id: string; name: string; sort_order: number;
}

export default function BottomNav() {
  const pathname = usePathname();
  const [groups, setGroups] = useState<PhaseGroup[]>([]);

  useEffect(() => {
    fetch('/api/phase-groups')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setGroups(d))
      .catch(() => {});
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t-2 border-border px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none">

        {/* Dashboard */}
        <Link
          href="/owner/dashboard"
          className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            pathname === '/owner/dashboard'
              ? 'bg-brown text-white border-brown'
              : 'border-border text-brown hover:border-brown hover:bg-surface-2'
          }`}
        >
          Dashboard
        </Link>

        <div className="w-px h-4 bg-border flex-shrink-0 mx-1" />

        {/* Orders — squared, always-bordered to stand out */}
        <Link
          href="/owner/pipeline/orders"
          className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-md border-2 transition-colors ${
            pathname === '/owner/pipeline/orders'
              ? 'bg-brown text-white border-brown'
              : 'border-brown text-brown hover:bg-brown hover:text-white'
          }`}
        >
          Orders
        </Link>

        <div className="w-px h-4 bg-border flex-shrink-0 mx-1" />

        {/* Dynamic phase groups */}
        {groups.map(g => {
          const href = `/owner/phase-group/${g.id}`;
          const active = pathname === href;
          return (
            <Link
              key={g.id}
              href={href}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? 'bg-brown text-white border-brown'
                  : 'border-border text-brown hover:border-brown hover:bg-surface-2'
              }`}
            >
              {g.name}
            </Link>
          );
        })}

        <div className="w-px h-4 bg-border flex-shrink-0 mx-1" />

        {/* Operations hub */}
        <Link
          href="/owner/operations"
          className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
            pathname.startsWith('/owner/operations')
              ? 'bg-brown text-white border-brown'
              : 'border-border text-text-muted hover:border-brown hover:text-brown'
          }`}
        >
          Operations
        </Link>

      </div>
    </nav>
  );
}
