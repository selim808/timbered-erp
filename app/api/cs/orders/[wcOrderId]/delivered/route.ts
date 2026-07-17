import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const FOLLOWUP_DAYS = 7;

// POST: confirm delivery. Sets cs_status='delivered' + delivered_at, and
// auto-creates the review follow-up row due FOLLOWUP_DAYS later.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ wcOrderId: string }> }
) {
  const { wcOrderId } = await params;
  const { created_by } = await req.json().catch(() => ({})) as { created_by?: string };

  const db = createAdminClient();
  const deliveredAt = new Date().toISOString();

  const { error: statusErr } = await db.rpc('cs_set_order_status', {
    p_wc_order_id: wcOrderId,
    p_new_status: 'delivered',
    p_note: 'Delivery confirmed by CS',
    p_created_by: created_by ?? null,
  });
  if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 500 });

  const { error: deliveredErr } = await db
    .from('cs_order_state')
    .update({ delivered_at: deliveredAt })
    .eq('wc_order_id', wcOrderId);
  if (deliveredErr) return NextResponse.json({ error: deliveredErr.message }, { status: 500 });

  const dueAt = new Date(Date.now() + FOLLOWUP_DAYS * 86400000).toISOString();
  const { error: followupErr } = await db
    .from('cs_review_followups')
    .upsert({ wc_order_id: wcOrderId, due_at: dueAt }, { onConflict: 'wc_order_id' });
  if (followupErr) return NextResponse.json({ error: followupErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, deliveredAt, reviewFollowupDueAt: dueAt });
}
