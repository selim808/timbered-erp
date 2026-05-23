import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface Item { card_id: string; phase: string }
interface Card { id: string; jo_id: string }
interface Jo { id: string; jo_number?: string; wc_order_id?: string }
interface PhaseRow { id: string; phase_group_id: string; name: string; sort_order: number }
interface GroupRow { id: string; name: string; sort_order: number }

export async function GET() {
  const db = createAdminClient();

  const [
    { data: jobOrders, error: e1 },
    { data: cards, error: e2 },
    { data: items, error: e3 },
    { data: phaseGroups, error: e4 },
    { data: phases, error: e5 },
  ] = await Promise.all([
    db.from('job_orders').select('*').order('created_at', { ascending: false }),
    db.from('production_cards').select('*').order('card_number', { ascending: true }),
    db.from('production_card_items').select('*'),
    db.from('phase_groups').select('id, name, sort_order').eq('is_active', true).order('sort_order', { ascending: true }),
    db.from('phases').select('id, phase_group_id, name, sort_order').eq('is_active', true).order('sort_order', { ascending: true }),
  ]);

  const err = e1 ?? e2 ?? e3 ?? e4 ?? e5;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  // Phase ordering for computing effective phase (earliest by group sort, then phase sort)
  const groupOrder = new Map<string, number>();
  (phaseGroups as GroupRow[] ?? []).forEach(g => groupOrder.set(g.id, g.sort_order));

  const sortedPhases = [...((phases as PhaseRow[]) ?? [])].sort((a, b) => {
    const ga = groupOrder.get(a.phase_group_id) ?? 9999;
    const gb = groupOrder.get(b.phase_group_id) ?? 9999;
    return ga - gb || a.sort_order - b.sort_order;
  });
  const phaseOrder = new Map<string, number>();
  sortedPhases.forEach((p, i) => phaseOrder.set(p.name, i));

  const itemsByCard = new Map<string, Item[]>();
  for (const item of (items as Item[] ?? [])) {
    if (!itemsByCard.has(item.card_id)) itemsByCard.set(item.card_id, []);
    itemsByCard.get(item.card_id)!.push(item);
  }

  const cardsByJo = new Map<string, Card[]>();
  for (const card of (cards as Card[] ?? [])) {
    if (!cardsByJo.has(card.jo_id)) cardsByJo.set(card.jo_id, []);
    cardsByJo.get(card.jo_id)!.push(card);
  }

  const joMap = new Map<string, Jo>();
  for (const jo of (jobOrders as Jo[] ?? [])) joMap.set(jo.id, jo);

  const assembledCards = (cards as Card[] ?? []).map(card => {
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

  const jos = (jobOrders as Jo[] ?? []).map(jo => ({
    ...jo,
    card_count: (cardsByJo.get(jo.id) ?? []).length,
    in_production: cardsByJo.has(jo.id),
  }));

  return NextResponse.json({
    jobOrders: jos,
    productionCards: assembledCards,
    phaseGroups: phaseGroups ?? [],
    phases: phases ?? [],
  });
}
