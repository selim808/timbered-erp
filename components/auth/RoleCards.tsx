'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import PinModal from './PinModal';

export default function RoleCards() {
  const router = useRouter();
  const [pinOpen, setPinOpen] = useState(false);

  return (
    <>
      <div className="flex gap-4">
        {/* Owner */}
        <button
          onClick={() => setPinOpen(true)}
          className="flex flex-col items-center justify-center gap-2.5 w-[140px] h-[140px] bg-white rounded-[20px] border-2 border-border hover:border-brown hover:shadow-card transition-all cursor-pointer"
        >
          <span className="text-[42px]">🪵</span>
          <span className="text-sm font-bold text-brown">Owner</span>
        </button>

        {/* Employee */}
        <button
          onClick={() => router.push('/employee')}
          className="flex flex-col items-center justify-center gap-2.5 w-[140px] h-[140px] bg-white rounded-[20px] border-2 border-border hover:border-brown hover:shadow-card transition-all cursor-pointer"
        >
          <span className="text-[42px]">👷</span>
          <span className="text-sm font-bold text-brown">Employee</span>
        </button>
      </div>

      <PinModal open={pinOpen} onClose={() => setPinOpen(false)} />
    </>
  );
}
