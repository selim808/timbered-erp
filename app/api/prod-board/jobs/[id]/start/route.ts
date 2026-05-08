import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import wc from '@/lib/woocommerce/client';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { startPhase } = await req.json() as { startPhase: string };

  if (!startPhase) return NextResponse.json({ error: 'startPhase required' }, { status: 400 });

  const db = createAdminClient();

  // Get job order
  const { data: jo, error: joErr } = await db
    .from('job_orders').select('*').eq('id', id).single();
  if (joErr || !jo) return NextResponse.json({ error: 'Job order not found' }, { status: 404 });

  // Fetch WC order to get line items
  let lineItems: any[] = [];
  try {
    const { data: wcOrder } = await wc.get(`/orders/${jo.wc_order_id}`);
    lineItems = wcOrder.line_items ?? [];
  } catch {
    return NextResponse.json({ error: `Failed to fetch WC order ${jo.wc_order_id}` }, { status: 502 });
  }

  // Create production card (card_number = 1 since it's the first)
  const { data: card, error: cardErr } = await db
    .from('production_cards')
    .insert({ jo_id: id, card_number: 1, status: 'in_production', notes: null })
    .select()
    .single();
  if (cardErr) return NextResponse.json({ error: cardErr.message }, { status: 500 });

  // Create one item per WC line item
  const itemRows = lineItems.map((li: any) => ({
    card_id: card.id,
    jo_id: id,
    wc_order_id: String(jo.wc_order_id),
    wc_line_item_id: String(li.id),
    wc_product_id: String(li.product_id ?? 0),
    product_name: li.name,
    quantity: li.quantity ?? 1,
    item_type: 'mto',
    is_full: true,
    part_number: null,
    total_parts: null,
    phase: startPhase,
  }));

  const { data: createdItems, error: itemErr } = await db
    .from('production_card_items')
    .insert(itemRows)
    .select();
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 });

  // Update JO status
  await db.from('job_orders').update({ status: 'production' }).eq('id', id);

  return NextResponse.json({
    card: {
      ...card,
      jo_number: jo.jo_number,
      wc_order_id: jo.wc_order_id,
      total_cards: 1,
      effective_phase: startPhase,
      items: createdItems ?? [],
    },
  });
}
