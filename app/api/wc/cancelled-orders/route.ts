import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchOrders } from '@/lib/commerce/orders';
import { mapOrderBase } from '@/lib/commerce/map';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';

export const maxDuration = 60;

const PER_PAGE = 50;

export interface CancelledOrdersResponse {
  orders: PipelineOrder[];
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
}

/** Woo carries no cancellation timestamp, so the last edit stands in for it. */
function cancelledAtOf(o: { date_cancelled: string | null; date_modified: string; date_created: string }) {
  return o.date_cancelled ?? o.date_modified ?? o.date_created;
}

function daysBetween(fromIso: string, toIso: string) {
  return Math.max(0, Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86400000));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);

    // Most recently cancelled first, so a fresh cancellation is at the top of
    // the retention list while the customer can still be won back. Two
    // storefronts can't share a server-side cursor, so the merged feed is
    // sorted and paged in memory.
    const cancelled = await fetchOrders({ status: 'cancelled' });
    cancelled.sort((a, b) => cancelledAtOf(b).localeCompare(cancelledAtOf(a)));

    const total      = cancelled.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const data       = cancelled.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const db = createAdminClient();
    const orderIds = data.map(o => String(o.id));

    const { data: phaseRows } = await db
      .from('item_phase')
      .select('order_id, line_item_id, phase')
      .in('order_id', orderIds);

    const phaseMap = new Map<string, string>();
    (phaseRows ?? []).forEach((r: any) => {
      phaseMap.set(`${r.order_id}-${r.line_item_id}`, r.phase);
    });

    const productIds = [...new Set(data.flatMap((o: any) =>
      (o.line_items ?? []).map((li: any) => li.product_id as number)
    ))];
    const { data: stockRows } = await db
      .from('stockcount')
      .select('product_id, stock')
      .in('product_id', productIds);
    const stockMap = new Map<number, number>();
    (stockRows ?? []).forEach((r: any) => stockMap.set(Number(r.product_id), r.stock ?? 0));

    const orders: PipelineOrder[] = data.map((o: any) => {
      const cancelledAt      = cancelledAtOf(o);
      const cancelledDaysAgo = Math.floor((Date.now() - new Date(cancelledAt).getTime()) / 86400000);
      const daysToCancel     = daysBetween(o.date_created ?? cancelledAt, cancelledAt);
      const lineItems: PipelineLineItem[] = (o.line_items ?? []).map((li: any) => ({
        id: li.id,
        productId: li.product_id,
        name: li.name,
        quantity: li.quantity,
        price: parseFloat(li.price ?? '0'),
        total: parseFloat(li.total ?? '0'),
        imageUrl: li.image?.src ?? '',
        // Whatever phase the item reached before it was cancelled; blank when it
        // never entered the pipeline, since "cancelled" is not a phase itself.
        phase: phaseMap.get(`${o.id}-${li.id}`) ?? '',
        stock: stockMap.get(li.product_id) ?? 0,
        orderedQty: li.quantity ?? 0,
      }));

      return {
        ...mapOrderBase(o, cancelledAt),
        cancelledDaysAgo,
        daysToCancel,
        ...(o.cancel_reason ? { cancelReason: o.cancel_reason as string } : {}),
        lineItems,
      };
    });

    const body: CancelledOrdersResponse = { orders, page, totalPages, total, perPage: PER_PAGE };
    return NextResponse.json(body);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
