import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH: log whether an upsell was offered/accepted during the confirmation call.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ wcOrderId: string }> }
) {
  const { wcOrderId } = await params;
  const body = await req.json() as {
    upsell_offered?: boolean; upsell_accepted?: boolean; upsell_note?: string;
  };

  const updates: Record<string, unknown> = { wc_order_id: wcOrderId };
  if (body.upsell_offered !== undefined) updates.upsell_offered = body.upsell_offered;
  if (body.upsell_accepted !== undefined) updates.upsell_accepted = body.upsell_accepted;
  if (body.upsell_note !== undefined) updates.upsell_note = body.upsell_note;

  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_order_state')
    .upsert(updates, { onConflict: 'wc_order_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
