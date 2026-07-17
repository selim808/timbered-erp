import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: durable cancellation log written by app/api/pipeline/orders/[id]/cancel.
export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_cancellations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: log a cancellation directly (used when the CS rep records a reason
// without going through the bulk CancelOrdersModal flow).
export async function POST(req: Request) {
  const { wc_order_id, reason, note, created_by } = await req.json() as {
    wc_order_id: string; reason: string; note?: string; created_by?: string;
  };
  if (!wc_order_id || !reason) {
    return NextResponse.json({ error: 'wc_order_id and reason required' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_cancellations')
    .insert({ wc_order_id, reason, note: note ?? null, created_by: created_by ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.rpc('cs_set_order_status', {
    p_wc_order_id: wc_order_id,
    p_new_status: 'cancelled',
    p_note: reason,
    p_created_by: created_by ?? null,
  });

  return NextResponse.json(data, { status: 201 });
}
