import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';

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
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
