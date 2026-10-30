import { NextResponse } from 'next/server';
import { cancelOrder, cancelNoteOf } from '@/lib/commerce/write';
import { createAdminClient } from '@/lib/supabase/admin';

// POST { reason, timing?, impact? }: cancel an order.
// Each value must come from its Supabase list (cancellation_reasons / _timing / _impact).
// On Shopify they go into the cancellation note and into timbered.cancel_* order fields.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { reason?: unknown; timing?: unknown; impact?: unknown };
  const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const details = { reason: clean(body.reason), timing: clean(body.timing), impact: clean(body.impact) };

  const db = createAdminClient();

  // Only accept values that exist in the active Supabase lists.
  const checks = [
    ['reason', 'cancellation_reasons'],
    ['timing', 'cancellation_timing'],
    ['impact', 'cancellation_impact'],
  ] as const;
  for (const [field, table] of checks) {
    const value = details[field];
    if (!value) continue;
    const { data, error } = await db.from(table).select('id').eq('label', value).eq('is_active', true).limit(1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: `"${value}" is not in the ${field} list` }, { status: 400 });
  }

  try {
    await cancelOrder(id, details);

    // Durable CS-facing record — the storefront's own marker is the source of
    // truth for the storefront, but doesn't give CS a queryable log.
    const note = cancelNoteOf(details);
    if (details.reason) {
      await db.from('cs_cancellations').insert({ wc_order_id: id, reason: details.reason });
    }
    await db.rpc('cs_set_order_status', {
      p_wc_order_id: id,
      p_new_status: 'cancelled',
      p_note: note || null,
      p_created_by: null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
