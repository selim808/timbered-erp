import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { itemIds } = await req.json() as { itemIds: string[] };

  if (!itemIds?.length) return NextResponse.json({ error: 'itemIds required' }, { status: 400 });

  const db = createAdminClient();

  // Get current card
  const { data: card, error: cardErr } = await db
    .from('production_cards').select('*').eq('id', id).single();
  if (cardErr || !card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  // Find max card_number for this JO
  const { data: joCards } = await db
    .from('production_cards').select('card_number').eq('jo_id', card.jo_id);
  const maxCardNum = Math.max(...(joCards ?? []).map((c: any) => c.card_number));

  // Create new card
  const { data: newCard, error: newCardErr } = await db
    .from('production_cards')
    .insert({ jo_id: card.jo_id, card_number: maxCardNum + 1, status: 'in_production', notes: null })
    .select()
    .single();
  if (newCardErr) return NextResponse.json({ error: newCardErr.message }, { status: 500 });

  // Move selected items to new card
  const { error: moveErr } = await db
    .from('production_card_items')
    .update({ card_id: newCard.id, updated_at: new Date().toISOString() })
    .in('id', itemIds);
  if (moveErr) return NextResponse.json({ error: moveErr.message }, { status: 500 });

  return NextResponse.json({ newCardId: newCard.id });
}
