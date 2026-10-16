import { NextResponse } from 'next/server';
import { fetchOrderById } from '@/lib/commerce/orders';
import { toWarrantyOrder } from '@/lib/warranty';

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
    return NextResponse.json(toWarrantyOrder(order));
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch order' },
      { status: 502 }
    );
  }
}
