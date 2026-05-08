import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const db = createAdminClient();

  const [
    { data: jobOrders, error: e1 },
    { data: cards, error: e2 },
    { data: items, error: e3 },
    { data: phaseGroups, error: e4 },
  ] = await Promise.all([
    db.from('job_orders').select('*').order('created_at', { ascending: false }),
    db.from('production_cards').select('*').order('card_number', { ascending: true }),
    db.from('production_card_items').select('*'),
    db.from('phase_groups').select('*').order('sort_order', { ascending: true }),
  ]);

  const err = e1 ?? e2 ?? e3 ?? e4;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  // Phase ordering for computing effective phase (earliest by group sort)
  const phaseOrder = new Map<string, number>();
  let idx = 0;
  for (const g of (phaseGroups ?? [])) {
    for (const p of (g.phases ?? [])) phaseOrder.set(p, idx++);
  }

  // Items grouped by card
  const itemsByCard = new Map<string, any[]>();
  for (const item of (items ?? [])) {
    if (!itemsByCard.has(item.card_id)) itemsByCard.set(item.card_id, []);
    itemsByCard.get(item.card_id)!.push(item);
  }

  // Cards grouped by JO
  const cardsByJo = new Map<string, any[]>();
  for (const card of (cards ?? [])) {
    if (!cardsByJo.has(card.jo_id)) cardsByJo.set(card.jo_id, []);
    cardsByJo.get(card.jo_id)!.push(card);
  }

  const joMap = new Map<string, any>();
  for (const jo of (jobOrders ?? [])) joMap.set(jo.id, jo);

  const assembledCards = (cards ?? []).map(card => {
    const cardItems = itemsByCard.get(card.id) ?? [];
    const joCards = cardsByJo.get(card.jo_id) ?? [];

    let effectivePhase = cardItems[0]?.phase ?? '';
    for (const item of cardItems) {
      const iOrd = phaseOrder.get(item.phase) ?? 9999;
      const eOrd = phaseOrder.get(effectivePhase) ?? 9999;
      if (iOrd < eOrd) effectivePhase = item.phase;
    }

    return {
      ...card,
      jo_number: joMap.get(card.jo_id)?.jo_number ?? '—',
      wc_order_id: joMap.get(card.jo_id)?.wc_order_id ?? '',
      total_cards: joCards.length,
      effective_phase: effectivePhase,
      items: cardItems,
    };
  });

  const jos = (jobOrders ?? []).map(jo => ({
    ...jo,
    card_count: (cardsByJo.get(jo.id) ?? []).length,
    in_production: cardsByJo.has(jo.id),
  }));

  return NextResponse.json({
    jobOrders: jos,
    productionCards: assembledCards,
    phaseGroups: phaseGroups ?? [],
  });
}
