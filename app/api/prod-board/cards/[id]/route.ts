import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { phase } = await req.json() as { phase: string };

  if (phase === undefined) return NextResponse.json({ error: 'phase required' }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from('production_card_items')
    .update({ phase, updated_at: new Date().toISOString() })
    .eq('card_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
