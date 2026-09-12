import { NextResponse } from 'next/server';
import { cancelOrder } from '@/lib/commerce/write';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let reason = '';
  try {
    const body = await req.json().catch(() => ({}));
    reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  } catch {
    // no body — cancel without a reason
  }

  try {
    await cancelOrder(id, reason);

    // Durable CS-facing record — the storefront's own marker is the source of
    // truth for the storefront, but doesn't give CS a queryable log.
    const db = createAdminClient();
    if (reason) {
      await db.from('cs_cancellations').insert({ wc_order_id: id, reason });
    }
    await db.rpc('cs_set_order_status', {
      p_wc_order_id: id,
      p_new_status: 'cancelled',
      p_note: reason || null,
      p_created_by: null,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
