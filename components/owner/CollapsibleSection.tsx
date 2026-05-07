'use client';

import { useState } from 'react';

interface Props {
  index: string | number;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accent?: string;
}

export default function CollapsibleSection({
  index, title, defaultOpen = false, children, accent = 'bg-brown',
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl overflow-hidden bg-surface shadow-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-4 py-4 hover:bg-surface-2 transition-colors"
      >
        <span className={`${accent} text-white text-xs font-black w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0`}>
          {index}
        </span>
        <span className="flex-1 text-left font-bold text-text text-[15px]">{title}</span>
        <span
          className="text-brown-mid text-sm transition-transform duration-300"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ›
        </span>
      </button>
      <div
        className="grid transition-all duration-300"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border">{children}</div>
        </div>
      </div>
    </div>
  );
}
