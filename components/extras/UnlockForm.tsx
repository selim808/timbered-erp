'use client';

import { useActionState } from 'react';
import { unlockExtra, type UnlockState } from '@/app/actions/extras';

export default function UnlockForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState<UnlockState | undefined, FormData>(
    unlockExtra.bind(null, slug),
    undefined
  );

  return (
    <form action={formAction} className="w-full space-y-3">
      <input
        type="password"
        name="password"
        autoFocus
        autoComplete="current-password"
        placeholder="Password"
        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-text outline-none focus:border-brown"
      />

      {state?.error && (
        <p className="text-xs font-semibold text-danger">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brown px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brown-mid disabled:opacity-50"
      >
        {pending ? 'Checking…' : 'Open page'}
      </button>
    </form>
  );
}
