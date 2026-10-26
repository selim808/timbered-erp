import { cookies } from 'next/headers';

// Read-only helpers for the Operations › General › Lists page.

export interface TableInfo {
  name: string;
  columns: string[];
}

/** True when the request carries the owner session cookie (same check as proxy.ts). */
export async function isOwnerRequest(): Promise<boolean> {
  const store = await cookies();
  return store.get('owner_session')?.value === 'true';
}

/**
 * Lists every table exposed in Supabase's public schema, with its columns,
 * by reading PostgREST's OpenAPI description. New tables appear automatically.
 */
export async function listPublicTables(): Promise<TableInfo[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');

  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase schema request failed (${res.status})`);

  const spec = await res.json() as {
    paths?: Record<string, unknown>;
    definitions?: Record<string, { properties?: Record<string, unknown> }>;
  };

  return Object.keys(spec.paths ?? {})
    .map(p => p.replace(/^\//, ''))
    .filter(name => name && !name.startsWith('rpc/'))
    .map(name => ({ name, columns: Object.keys(spec.definitions?.[name]?.properties ?? {}) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
