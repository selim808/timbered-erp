'use client';

import { useState, useEffect } from 'react';
import { ownerLogin } from '@/app/actions/auth';
import PinKeypad from './PinKeypad';

interface Props {
  open: boolean;
  onClose: () => void;
}

type DotState = 'empty' | 'filled' | 'error';

export default function PinModal({ open, onClose }: Props) {
  const [pin, setPin] = useState('');
  const [dotState, setDotState] = useState<DotState>('empty');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setPin(''); setDotState('empty'); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key);
      else if (e.key === 'Backspace') handleDelete();
      else if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pin, loading]);

  async function handleKey(digit: string) {
    if (pin.length >= 4 || loading) return;
    const next = pin + digit;
    setPin(next);

    if (next.length === 4) {
      setLoading(true);
      const fd = new FormData();
      fd.append('pin', next);
      const result = await ownerLogin(fd);
      if (result?.error) {
        setDotState('error');
        setTimeout(() => { setPin(''); setDotState('empty'); setLoading(false); }, 700);
      }
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-[20px] p-7 w-[260px] flex flex-col items-center gap-4 shadow-hover">
        <p className="text-sm font-bold text-brown">Enter PIN</p>

        {/* Dots */}
        <div className="flex gap-2.5">
          {[0,1,2,3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                dotState === 'error' && i < pin.length
                  ? 'bg-danger border-danger'
                  : i < pin.length
                  ? 'bg-brown border-brown'
                  : 'bg-white border-border'
              }`}
            />
          ))}
        </div>

        <PinKeypad onKey={handleKey} onDelete={handleDelete} />

        <button
          onClick={onClose}
          className="text-xs text-text-muted bg-transparent border-none cursor-pointer mt-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
