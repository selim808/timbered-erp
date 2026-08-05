import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapOrderBase } from '@/lib/woocommerce/orders';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';

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

    const { data, headers } = await wc.get('/orders', {
      params: { status: 'completed', orderby: 'modified', order: 'desc', per_page: PER_PAGE, page },
    });

    const total      = parseInt(headers['x-wp-total']      ?? '0', 10) || 0;
    const totalPages = parseInt(headers['x-wp-totalpages'] ?? '1', 10) || 1;

    const db = createAdminClient();
    const orderIds = data.map((o: any) => String(o.id));

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
