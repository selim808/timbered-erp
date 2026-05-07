'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import PinModal from './PinModal';

const LOGO = 'https://timberedgroup.com/wp-content/uploads/2024/04/Asset-14.png';

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
          <Image src={LOGO} alt="Owner" width={52} height={52} className="object-contain" />
          <span className="text-sm font-bold text-brown">Owner</span>
        </button>

        {/* Employee */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex flex-col items-center justify-center gap-2.5 w-[140px] h-[140px] bg-white rounded-[20px] border-2 border-border hover:border-brown hover:shadow-card transition-all cursor-pointer"
        >
          <Image src={LOGO} alt="Employee" width={52} height={52} className="object-contain" />
          <span className="text-sm font-bold text-brown">Employee</span>
        </button>
      </div>

      <PinModal open={pinOpen} onClose={() => setPinOpen(false)} />
    </>
  );
}
