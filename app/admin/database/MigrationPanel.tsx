'use client';

import { useState } from 'react';

export default function MigrationPanel({
  sql,
  allReady,
}: {
  sql: string;
  allReady: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-surface border-2 border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <p className="font-semibold text-text text-sm">Migration SQL</p>
        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            className="text-xs px-3 py-1.5 rounded-full border border-border text-brown font-semibold hover:bg-surface-2 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy SQL'}
          </button>
          <a
            href="https://supabase.com/dashboard/project/wpmeajpzlzdxrahgubxl/sql/new"
            target="_blank"
            rel="noreferrer"
            className="text-xs px-3 py-1.5 rounded-full bg-brown text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Open SQL Editor →
          </a>
        </div>
      </div>

      {allReady ? (
        <div className="px-5 py-4 text-sm text-success font-medium">
          ✓ Migration already applied — all tables exist.
        </div>
      ) : (
        <>
          <div className="px-5 py-3 bg-accent-bg border-b border-border">
            <p className="text-xs text-brown-mid">
              Copy the SQL, open the SQL Editor, paste and run it.
            </p>
          </div>
          <pre className="p-5 text-xs text-text-muted overflow-auto max-h-64 leading-relaxed">
            {sql}
          </pre>
        </>
      )}
    </div>
  );
}
