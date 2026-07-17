import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: review follow-ups due (due_at <= now) or all, newest due first.
export async function GET(req: Request) {
  const dueOnly = new URL(req.url).searchParams.get('due') === '1';
  const db = createAdminClient();
  let q = db.from('cs_review_followups').select('*').order('due_at', { ascending: true });
  if (dueOnly) q = q.lte('due_at', new Date().toISOString()).eq('outcome', 'pending');
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
