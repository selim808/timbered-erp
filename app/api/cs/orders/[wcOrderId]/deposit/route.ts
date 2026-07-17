import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH: update deposit fields on cs_order_state. Body: { deposit_required?,
// deposit_amount?, mark_paid? }. mark_paid stamps deposit_paid_at = now().
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ wcOrderId: string }> }
) {
  const { wcOrderId } = await params;
  const body = await req.json() as {
    deposit_required?: boolean; deposit_amount?: number; mark_paid?: boolean;
  };

  const updates: Record<string, unknown> = { wc_order_id: wcOrderId };
  if (body.deposit_required !== undefined) updates.deposit_required = body.deposit_required;
  if (body.deposit_amount !== undefined) updates.deposit_amount = body.deposit_amount;
  if (body.mark_paid) updates.deposit_paid_at = new Date().toISOString();

  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_order_state')
    .upsert(updates, { onConflict: 'wc_order_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
