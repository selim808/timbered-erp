'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PIPELINE = [
  { label: 'Orders',     href: '/owner/pipeline/orders' },
  { label: 'Review',     href: '/owner/pipeline/review' },
  { label: 'Planning',   href: '/owner/pipeline/planning' },
  { label: 'Production', href: '/owner/pipeline/production' },
  { label: 'Shipping',   href: '/owner/pipeline/shipping' },
  { label: 'Warehouse',  href: '/owner/pipeline/warehouse' },
  { label: 'Delivery',   href: '/owner/pipeline/delivery' },
  { label: 'Follow-up',  href: '/owner/pipeline/follow-up' },
];

const ADMIN = [
  { label: 'Production', href: '/owner/production' },
  { label: 'Phases',     href: '/owner/phases' },
  { label: 'Database',   href: '/admin/database' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t-2 border-border px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none">
        {PIPELINE.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              pathname === href
                ? 'bg-brown text-white border-brown'
                : 'border-border text-brown hover:border-brown hover:bg-surface-2'
            }`}
          >
            {label}
          </Link>
        ))}
        <div className="w-px h-4 bg-border flex-shrink-0 mx-1" />
        {ADMIN.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border border-border text-text-muted hover:border-brown hover:text-brown transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
