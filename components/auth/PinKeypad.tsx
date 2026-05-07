'use client';

interface Props {
  onKey: (digit: string) => void;
  onDelete: () => void;
}

const KEYS = ['1','2','3','4','5','6','7','8','9'];

export default function PinKeypad({ onKey, onDelete }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {KEYS.map((k) => (
        <button
          key={k}
          onClick={() => onKey(k)}
          className="h-[52px] border border-border rounded-xl bg-white text-lg font-bold text-text active:bg-accent-bg transition-colors"
        >
          {k}
        </button>
      ))}
      {/* empty slot */}
      <div />
      <button
        onClick={() => onKey('0')}
        className="h-[52px] border border-border rounded-xl bg-white text-lg font-bold text-text active:bg-accent-bg transition-colors"
      >
        0
      </button>
      <button
        onClick={onDelete}
        className="h-[52px] border border-border rounded-xl bg-white text-sm text-text-muted active:bg-accent-bg transition-colors"
      >
        ⌫
      </button>
    </div>
  );
}
