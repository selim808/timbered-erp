import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import wc from '@/lib/woocommerce/client';

interface StoredJOItem {
  product_id: number;
  product_name: string;
  total_qty: number;
  mto: { qty: number; orders: { order_id: number; customer: string; qty: number }[] };
  mts: { qty: number };
}

interface WcLineItem {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
}

export async function POST(req: Request) {
  const { jo_plan_id, start_phase } = await req.json() as {
    jo_plan_id: string;
    start_phase: string;
  };

  if (!jo_plan_id || !start_phase) {
    return NextResponse.json({ error: 'jo_plan_id and start_phase required' }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: joPlan, error: planErr } = await db
    .from('jo_plans')
    .select('*')
    .eq('id', jo_plan_id)
    .single();

  if (planErr || !joPlan) {
    return NextResponse.json({ error: 'JO plan not found' }, { status: 404 });
  }

  const items: StoredJOItem[] = joPlan.items ?? [];

  // Collect unique WC order IDs from MTO items so we can resolve line_item_ids
  const orderIds = [...new Set(
    items.flatMap(i => i.mto.orders.map(o => o.order_id)).filter(Boolean)
  )];

  // Fetch WC orders in parallel to build a product_id → line_item_id map per order
  // Map: order_id → Map<product_id, line_item_id>
  const lineItemMap = new Map<number, Map<number, number>>();
  await Promise.all(orderIds.map(async orderId => {
    try {
      const { data } = await wc.get(`/orders/${orderId}`);
      const byProduct = new Map<number, number>();
      (data.line_items ?? []).forEach((li: WcLineItem) => {
        byProduct.set(li.product_id, li.id);
      });
      lineItemMap.set(orderId, byProduct);
    } catch {
      // If a WC fetch fails, we still proceed — line_item_id stays blank for that order
    }
  }));

  // Create job_order record
  const { data: jobOrder, error: joErr } = await db
    .from('job_orders')
    .insert({ jo_number: joPlan.ref, wc_order_id: String(orderIds[0] ?? ''), status: 'production', notes: null })
    .select()
    .single();

  if (joErr) return NextResponse.json({ error: joErr.message }, { status: 500 });

  // Create production card
  const { data: card, error: cardErr } = await db
    .from('production_cards')
    .insert({ jo_id: jobOrder.id, card_number: 1, status: 'in_production', notes: null })
    .select()
    .single();

  if (cardErr) return NextResponse.json({ error: cardErr.message }, { status: 500 });

  // Build one card item per jo_plan item, resolving wc_line_item_id from WC data
  const itemRows = items.map(item => {
    const firstMtoOrder = item.mto.orders[0];
    const wcOrderId = firstMtoOrder ? String(firstMtoOrder.order_id) : '';
    const wcLineItemId = firstMtoOrder
      ? String(lineItemMap.get(firstMtoOrder.order_id)?.get(item.product_id) ?? '')
      : '';

    return {
      card_id:         card.id,
      jo_id:           jobOrder.id,
      wc_order_id:     wcOrderId,
      wc_line_item_id: wcLineItemId,
      wc_product_id:   String(item.product_id),
      product_name:    item.product_name,
      quantity:        item.total_qty,
      item_type:       item.mto.qty > 0 ? 'mto' : 'mts',
      is_full:         true,
      part_number:     null,
      total_parts:     null,
      phase:           start_phase,
    };
  });

  const { data: createdItems, error: itemErr } = await db
    .from('production_card_items')
    .insert(itemRows)
    .select();

  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 });

  // Sync item_phase to start_phase for all linked line items
  const syncRows = itemRows
    .filter(i => i.wc_order_id && i.wc_line_item_id)
    .map(i => ({
      order_id:     i.wc_order_id,
      line_item_id: i.wc_line_item_id,
      phase:        start_phase,
      item_name:    i.product_name,
      total:        i.quantity,
      updated_at:   new Date().toISOString(),
    }));

  if (syncRows.length > 0) {
    await db.from('item_phase').upsert(syncRows, { onConflict: 'order_id,line_item_id' });
  }

  // Mark jo_plan as done
  await db.from('jo_plans').update({ status: 'done' }).eq('id', jo_plan_id);

  return NextResponse.json({
    card: {
      ...card,
      jo_number:       joPlan.ref,
      wc_order_id:     String(orderIds[0] ?? ''),
      total_cards:     1,
      effective_phase: start_phase,
      items:           createdItems ?? [],
    },
  });
}
