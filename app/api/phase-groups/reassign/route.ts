import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const { from, to } = await req.json() as { from: string; to: string };
  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from('item_phase')
    .update({ phase: to, updated_at: new Date().toISOString() })
    .eq('phase', from);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
