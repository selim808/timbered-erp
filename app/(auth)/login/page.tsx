'use client';

import { useState } from 'react';
import { login } from '@/app/actions/auth';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl text-brown">Timbered</h1>
        <p className="text-text-muted text-sm mt-1">Internal Operations</p>
      </div>

      {/* Card */}
      <div className="bg-surface border-2 border-border rounded-2xl p-8 shadow-card">
        <h2 className="font-semibold text-text text-base mb-6">Sign in</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 text-sm border-2 border-border rounded-lg bg-cream text-text placeholder:text-text-muted focus:outline-none focus:border-brown transition-colors"
              placeholder="you@timberedgroup.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 text-sm border-2 border-border rounded-lg bg-cream text-text placeholder:text-text-muted focus:outline-none focus:border-brown transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-danger font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brown text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-text-muted mt-6">
        Timbered Group · ERP v1
      </p>
    </div>
  );
}
