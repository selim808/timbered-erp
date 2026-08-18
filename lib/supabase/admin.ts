import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Supabase surfaces transport failures as an opaque "TypeError: fetch failed"
 * (postgrest-js formats a thrown fetch as `${name}: ${message}` with status 0),
 * which tells an operator nothing. Map the two failures worth distinguishing
 * onto something actionable before sending the message to the client.
 */
export function describeDbError(error: { message: string; code?: string }) {
  if (/fetch failed/i.test(error.message))
    return 'Cannot reach Supabase — the project may be paused, or NEXT_PUBLIC_SUPABASE_URL is wrong.';
  if (error.code === 'PGRST205' || /schema cache/i.test(error.message))
    return `${error.message} (pending migration?)`;
  return error.message;
}
