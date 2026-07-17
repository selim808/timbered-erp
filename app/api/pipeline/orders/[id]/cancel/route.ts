import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';
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
    const payload: Record<string, unknown> = { status: 'cancelled' };

    if (reason) {
      payload.meta_data = [{ key: 'cancellation_reason', value: reason }];

      // Append "__<reason>" to the customer's last name so the reason is
      // visible alongside the name. Skip if a marker is already present.
      const { data: order } = await wc.get(`/orders/${id}`);
      const lastName = String(order?.billing?.last_name ?? '');
      if (!lastName.includes('__')) {
        payload.billing = { last_name: `${lastName}__${reason}` };
      }
    }

    await wc.put(`/orders/${id}`, payload);

    // Durable CS-facing record — the WC meta_data/last-name marker above is
    // the source of truth for WC itself, but doesn't give CS a queryable log.
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
