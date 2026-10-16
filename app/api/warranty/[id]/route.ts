import { NextResponse } from 'next/server';
import { fetchOrderById } from '@/lib/commerce/orders';

// GET: everything the guarantee certificate needs for one order.
// The guarantee runs from the order creation date (see warranty page).
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
      orderNumber:  String(order.number || order.id),
      status:       order.status,
      customerName: [b.first_name, b.last_name].filter(Boolean).join(' '),
      dateCreated:  order.date_created,
      lineItems:    order.line_items.map(li => ({
        id:       li.id,
        name:     li.name,
        quantity: li.quantity,
      })),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch order' },
      { status: 502 }
    );
  }
}
