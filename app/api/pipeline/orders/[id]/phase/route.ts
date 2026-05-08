import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { lineItemId, phase } = await req.json() as { lineItemId: string; phase: string };

  if (!lineItemId || phase === undefined) {
    return NextResponse.json({ error: 'lineItemId and phase required' }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: existing } = await db
    .from('order_phases')
    .select('id')
    .eq('order_id', id)
    .eq('line_item_id', lineItemId)
    .maybeSingle();

  const { error } = existing
    ? await db.from('order_phases')
        .update({ phase, updated_at: new Date().toISOString() })
        .eq('order_id', id)
        .eq('line_item_id', lineItemId)
    : await db.from('order_phases')
        .insert({ order_id: id, line_item_id: lineItemId, phase });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
