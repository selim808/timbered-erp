import { NextResponse } from 'next/server';
import { fetchOrderById } from '@/lib/commerce/orders';
import { mapOrderBase } from '@/lib/commerce/map';
import { itemPhaseOf } from '@/lib/phases/kanban';
import type { PipelineOrder } from '@/app/api/pipeline/orders/route';

const DAY_MS = 86_400_000;

// GET: one order in the shared order-popup shape (OrderDetailSheet), whatever
// its status: items with their current phase, cancellation details, and the
// payment/shipping extras the Weekly and Monthly lists used to show.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const o = await fetchOrderById(id);
    if (!o) return NextResponse.json({ error: `Order ${id} not found` }, { status: 404 });

    const cancelledAt = o.status === 'cancelled' ? (o.date_cancelled ?? o.date_modified) : null;
    const order: PipelineOrder = {
      ...mapOrderBase(o, o.date_created),
      status: o.status,
      orderedAt: o.date_created,
      ...(o.status === 'completed' && o.date_completed ? { completedAt: o.date_completed } : {}),
      ...(cancelledAt ? {
        cancelledAt,
        daysToCancel: Math.max(0, Math.floor((new Date(cancelledAt).getTime() - new Date(o.date_created).getTime()) / DAY_MS)),
      } : {}),
      ...(o.cancel_reason ? { cancelReason: o.cancel_reason } : {}),
      ...(o.cancel_timing ? { cancelTiming: o.cancel_timing } : {}),
      ...(o.cancel_impact ? { cancelImpact: o.cancel_impact } : {}),
      email: o.email,
      paymentMethod: o.payment_method,
      shippingMethod: o.shipping_method,
      shippingTotal: parseFloat(o.shipping_total) || 0,
      discountTotal: parseFloat(o.discount_total) || 0,
      fees: o.fee_lines.map(f => ({ name: f.name, total: parseFloat(f.total) || 0 })),
      lineItems: o.line_items.map(li => ({
        id: li.id,
        productId: li.product_id,
        name: li.name,
        quantity: li.quantity,
        price: li.price,
        total: parseFloat(li.total) || 0,
        imageUrl: li.image?.src ?? '',
        phase: itemPhaseOf(o, li.id)?.phase ?? '',
        stock: 0,
        orderedQty: li.quantity,
      })),
    };
    return NextResponse.json(order);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load order' },
      { status: 502 },
    );
  }
}
