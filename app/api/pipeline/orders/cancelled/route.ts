import { NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/commerce/orders';

const PER_PAGE = 20;

export interface CancelledLineItem {
  id: number;
  name: string;
  quantity: number;
  total: number;
  imageUrl: string;
}

export interface CancelledOrder {
  id: number;
  number: string;
  dateCancelled: string;
  customerName: string;
  customerPhone: string;
  total: number;
  reason: string;
  lineItems: CancelledLineItem[];
}

// Strip the "__<reason>" suffix we append to last_name on cancel.
function cleanName(first: string, last: string) {
  const idx = last.indexOf('__');
  const cleanLast = idx === -1 ? last : last.slice(0, idx);
  return `${first} ${cleanLast}`.trim();
}

function reasonFrom(o: any): string {
  const meta = (o.meta_data ?? []).find((m: any) => m.key === 'cancellation_reason');
  if (meta?.value) return String(meta.value);
  // Fallback: parse from the last_name suffix.
  const last = String(o.billing?.last_name ?? '');
  const idx = last.indexOf('__');
  return idx === -1 ? '' : last.slice(idx + 2);
}

// GET ?page=N — cancelled orders, newest-cancelled first, 20 per page.
export async function GET(req: Request) {
  const page = Math.max(1, Number(new URL(req.url).searchParams.get('page')) || 1);
  try {
    // Merged across storefronts, so paging happens in memory rather than on a
    // single platform's cursor.
    const all = await fetchOrders({ status: 'cancelled' });
    all.sort((a, b) => b.date_modified.localeCompare(a.date_modified));

    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const pageRows = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const orders: CancelledOrder[] = pageRows.map((o: any) => ({
      id: o.id,
      number: o.number,
      dateCancelled: o.date_modified,
      customerName: cleanName(o.billing?.first_name ?? '', o.billing?.last_name ?? ''),
      customerPhone: o.billing?.phone ?? '',
      total: parseFloat(o.total ?? '0'),
      reason: reasonFrom(o),
      lineItems: (o.line_items ?? []).map((li: any) => ({
        id: li.id,
        name: li.name,
        quantity: li.quantity,
        total: parseFloat(li.total ?? '0'),
        imageUrl: li.image?.src ?? '',
      })),
    }));

    return NextResponse.json({ orders, page, totalPages, total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
