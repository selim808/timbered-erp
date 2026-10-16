import { NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/commerce/orders';
import { toWarrantyOrder, type WarrantyOrder } from '@/lib/warranty';

export const maxDuration = 60;

const PER_PAGE = 50;

export interface WarrantyOrdersResponse {
  orders: WarrantyOrder[];
  page: number;
  totalPages: number;
  total: number;
}

// GET: completed orders for picking guarantees in bulk, most recently
// completed first. ?q= filters by order number or customer name.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase().replace(/^#/, '');

    const completed = await fetchOrders({ status: 'completed' });
    completed.sort((a, b) =>
      (b.date_completed ?? b.date_modified).localeCompare(a.date_completed ?? a.date_modified));

    let orders = completed.map(toWarrantyOrder);
    if (q) {
      orders = orders.filter(o =>
        o.orderNumber.includes(q) || o.customerName.toLowerCase().includes(q));
    }

    const total      = orders.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const body: WarrantyOrdersResponse = {
      orders: orders.slice((page - 1) * PER_PAGE, page * PER_PAGE),
      page,
      totalPages,
      total,
    };
    return NextResponse.json(body);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch orders' },
      { status: 502 }
    );
  }
}
