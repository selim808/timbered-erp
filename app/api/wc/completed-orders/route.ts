import { NextResponse } from 'next/server';
import { itemPhaseOf } from '@/lib/phases/kanban';
import { getStockIndex, stockOf } from '@/lib/stock';
import { fetchOrders } from '@/lib/commerce/orders';
import { mapOrderBase } from '@/lib/commerce/map';
import { orderMatches } from '@/lib/commerce/search';
import { warrantyCode } from '@/lib/warrantyLink';
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
    const q    = (url.searchParams.get('q') ?? '').trim();

    // Two storefronts can't share one server-side cursor, so the merged feed is
    // sorted and paged in memory. Most recently touched first, so orders just
    // flipped to completed surface at the top.
    const all = await fetchOrders({ status: 'completed' });
    // Search runs over the whole feed (before paging), not just one page.
    const completed = q ? all.filter(o => orderMatches(o, q)) : all;
    completed.sort((a, b) =>
      (b.date_completed ?? b.date_modified).localeCompare(a.date_completed ?? a.date_modified));

    const total      = completed.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const data       = completed.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const stockIndex = await getStockIndex();

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
        phase: itemPhaseOf(o, li.id)?.phase ?? '',
        stock: stockOf(stockIndex, li),
        orderedQty: li.quantity ?? 0,
      }));

      return {
        ...mapOrderBase(o, completedAt),
        completedDaysAgo,
        leadTimeDays,
        warrantyCode: warrantyCode(String(o.number || o.id)),
        lineItems,
      };
    });

    const body: CompletedOrdersResponse = { orders, page, totalPages, total, perPage: PER_PAGE };
    return NextResponse.json(body);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
