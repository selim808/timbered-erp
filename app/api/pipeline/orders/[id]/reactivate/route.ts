import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';

// POST: move a cancelled order back to processing. Reverts the "__<reason>"
// suffix on the customer's last name and clears the cancellation_reason meta,
// so reactivating fully undoes the cancel.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data: order } = await wc.get(`/orders/${id}`);
    const lastName = String(order?.billing?.last_name ?? '');
    const idx = lastName.indexOf('__');
    const cleanLast = idx === -1 ? lastName : lastName.slice(0, idx);

    await wc.put(`/orders/${id}`, {
      status: 'processing',
      ...(idx === -1 ? {} : { billing: { last_name: cleanLast } }),
      meta_data: [{ key: 'cancellation_reason', value: '' }],
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
