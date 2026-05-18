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

  // Fetch items first so we can sync item_phase
  const { data: items, error: fetchErr } = await db
    .from('production_card_items')
    .select('wc_order_id, wc_line_item_id, product_name, quantity')
    .eq('card_id', id);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  // Update production_card_items
  const { error: updateErr } = await db
    .from('production_card_items')
    .update({ phase, updated_at: new Date().toISOString() })
    .eq('card_id', id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Sync item_phase so the orders pipeline stays in agreement
  const syncRows = (items ?? [])
    .filter(i => i.wc_order_id && i.wc_line_item_id)
    .map(i => ({
      order_id:     i.wc_order_id,
      line_item_id: i.wc_line_item_id,
      phase,
      item_name:    i.product_name,
      total:        i.quantity,
      updated_at:   new Date().toISOString(),
    }));

  if (syncRows.length > 0) {
    const { error: syncErr } = await db
      .from('item_phase')
      .upsert(syncRows, { onConflict: 'order_id,line_item_id' });

    if (syncErr) return NextResponse.json({ error: syncErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
