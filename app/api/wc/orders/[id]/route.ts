import { NextResponse } from 'next/server';
import { fetchOrderById } from '@/lib/commerce/orders';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const order = await fetchOrderById(id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const b = order.billing;
    return NextResponse.json({
      id: order.id,
      source: order.source,
      status: order.status,
      dateCreated: (order.date_created ?? '').replace('T', ' ').slice(0, 16),
      customer: {
        name:    [b.first_name, b.last_name].filter(Boolean).join(' '),
        phone:   b.phone,
        address: [b.address_1, b.address_2, b.city].filter(Boolean).join(', '),
      },
      lineItems: order.line_items.map(li => ({
        id:       li.id,
        name:     li.name,
        quantity: li.quantity,
        total:    li.total,
      })),
      total:    order.total,
      currency: 'EGP',
      note:     order.customer_note,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch order' },
      { status: 502 }
    );
  }
}
