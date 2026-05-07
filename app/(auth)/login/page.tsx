'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ownerLogin } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleKeypad(val: string) {
    if (pin.length < 6) setPin((p) => p + val);
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const fd = new FormData();
    fd.append('pin', pin);
    const result = await ownerLogin(fd);
    if (result?.error) {
      setError(result.error);
      setPin('');
      setLoading(false);
    }
  }

  if (showPin) {
    return (
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <h1 className="font-serif text-3xl text-brown">Timbered</h1>
          <p className="text-text-muted text-sm mt-1">Owner Access</p>
        </div>

        <div className="bg-surface border-2 border-border rounded-2xl p-6 shadow-card">
          {/* PIN dots */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border-2 transition-colors ${
                  i < pin.length ? 'bg-brown border-brown' : 'border-border'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-xs text-danger font-medium mb-4">{error}</p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <button
                key={n}
                onClick={() => handleKeypad(String(n))}
                className="h-12 rounded-xl border-2 border-border bg-cream text-text font-semibold text-base hover:bg-surface-2 hover:border-border-strong transition-colors"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => { setShowPin(false); setPin(''); setError(null); }}
              className="h-12 rounded-xl border-2 border-border bg-cream text-text-muted text-xs font-semibold hover:bg-surface-2 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => handleKeypad('0')}
              className="h-12 rounded-xl border-2 border-border bg-cream text-text font-semibold text-base hover:bg-surface-2 hover:border-border-strong transition-colors"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-12 rounded-xl border-2 border-border bg-cream text-text-muted font-semibold text-base hover:bg-surface-2 transition-colors"
            >
              ⌫
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={pin.length < 4 || loading}
            className="w-full mt-4 py-2.5 bg-brown text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? 'Verifying…' : 'Enter'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl text-brown">Timbered</h1>
        <p className="text-text-muted text-sm mt-1">Internal Operations</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Owner card */}
        <button
          onClick={() => setShowPin(true)}
          className="bg-surface border-2 border-border rounded-2xl p-6 text-center hover:border-brown hover:shadow-card transition-all group"
        >
          <div className="text-2xl mb-3">🪵</div>
          <p className="font-semibold text-text text-sm group-hover:text-brown transition-colors">Owner</p>
          <p className="text-xs text-text-muted mt-1">PIN required</p>
        </button>

        {/* Employee card */}
        <button
          onClick={() => router.push('/dashboard')}
          className="bg-surface border-2 border-border rounded-2xl p-6 text-center hover:border-brown hover:shadow-card transition-all group"
        >
          <div className="text-2xl mb-3">👷</div>
          <p className="font-semibold text-text text-sm group-hover:text-brown transition-colors">Employee</p>
          <p className="text-xs text-text-muted mt-1">Open access</p>
        </button>
      </div>

      <p className="text-center text-xs text-text-muted mt-8">
        Timbered Group · ERP v1
      </p>
    </div>
  );
}
