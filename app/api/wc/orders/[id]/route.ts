import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data } = await wc.get(`/orders/${id}`);
    const b = data.billing ?? {};
    return NextResponse.json({
      id: data.id,
      status: data.status,
      dateCreated: (data.date_created ?? '').replace('T', ' ').slice(0, 16),
      customer: {
        name:    [b.first_name, b.last_name].filter(Boolean).join(' '),
        phone:   b.phone ?? '',
        address: [b.address_1, b.address_2, b.city].filter(Boolean).join(', '),
      },
      lineItems: (data.line_items ?? []).map((li: { id: number; name: string; quantity: number; total: string }) => ({
        id:       li.id,
        name:     li.name,
        quantity: li.quantity,
        total:    li.total,
      })),
      total:    data.total,
      currency: data.currency ?? 'EGP',
      note:     data.customer_note ?? '',
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch order' },
      { status: 502 }
    );
  }
}
