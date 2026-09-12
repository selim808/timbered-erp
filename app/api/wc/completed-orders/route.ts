import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchOrders } from '@/lib/commerce/orders';
import { mapOrderBase } from '@/lib/commerce/map';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';

export const maxDuration = 60;

const PER_PAGE = 50;

export interface CompletedOrdersResponse {
  orders: PipelineOrder[];
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);

    // Two storefronts can't share one server-side cursor, so the merged feed is
    // sorted and paged in memory. Most recently touched first, so orders just
    // flipped to completed surface at the top.
    const completed = await fetchOrders({ status: 'completed' });
    completed.sort((a, b) =>
      (b.date_completed ?? b.date_modified).localeCompare(a.date_completed ?? a.date_modified));

    const total      = completed.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const data       = completed.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
      const completedAt = o.date_completed ?? o.date_modified ?? o.date_created;
      const completedMs = new Date(completedAt).getTime();
      const createdMs   = new Date(o.date_created ?? completedAt).getTime();
      const completedDaysAgo = Math.floor((Date.now() - completedMs) / 86400000);
      const leadTimeDays     = Math.max(0, Math.floor((completedMs - createdMs) / 86400000));
      const lineItems: PipelineLineItem[] = (o.line_items ?? []).map((li: any) => ({
        id: li.id,
        productId: li.product_id,
        name: li.name,
        quantity: li.quantity,
        price: parseFloat(li.price ?? '0'),
        total: parseFloat(li.total ?? '0'),
        imageUrl: li.image?.src ?? '',
        phase: phaseMap.get(`${o.id}-${li.id}`) ?? 'Follow-up',
        stock: stockMap.get(li.product_id) ?? 0,
        orderedQty: li.quantity ?? 0,
      }));

      return { ...mapOrderBase(o, completedAt), completedDaysAgo, leadTimeDays, lineItems };
    });

    const body: CompletedOrdersResponse = { orders, page, totalPages, total, perPage: PER_PAGE };
    return NextResponse.json(body);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
