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

  const { data: existingRows, error: readError } = await db
    .from('item_phase')
    .select('id')
    .eq('order_id', id)
    .eq('line_item_id', lineItemId)
    .order('updated_at', { ascending: false });

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

  const latest = existingRows?.[0];
  const duplicates = existingRows?.slice(1).map(row => row.id) ?? [];
  const now = new Date().toISOString();

  const { error: writeError } = latest
    ? await db.from('item_phase')
        .update({ phase, updated_at: now })
        .eq('id', latest.id)
    : await db.from('item_phase')
        .insert({ order_id: id, line_item_id: lineItemId, phase, updated_at: now });

  if (writeError) return NextResponse.json({ error: writeError.message }, { status: 500 });

  if (duplicates.length > 0) {
    const { error: deleteError } = await db.from('item_phase').delete().in('id', duplicates);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
