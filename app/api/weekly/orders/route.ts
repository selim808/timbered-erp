import { NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/commerce/orders';
import type { CommerceOrder } from '@/lib/commerce/types';

export interface OrderRow {
  id: number;
  number: string;
  status: string;
  total: number;
  customer: string;
  items: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date    = searchParams.get('date');    // YYYY-MM-DD — single day
  const start   = searchParams.get('start');   // YYYY-MM-DD — range start (alt. to date)
  const end     = searchParams.get('end');     // YYYY-MM-DD — range end (inclusive)
  const metric  = searchParams.get('metric');  // created | completed | cancelled

  const rangeStart = date ?? start;
  const rangeEnd   = date ?? end;

  if (!rangeStart || !rangeEnd || !metric) {
    return NextResponse.json({ error: 'Missing date or metric' }, { status: 400 });
  }

  const after  = `${rangeStart}T00:00:00`;
  const before = `${rangeEnd}T23:59:59`;

  try {
    let raw: CommerceOrder[] = [];

    if (metric === 'created') {
      raw = await fetchOrders({ after, before });
      raw = raw.filter(o => ['completed', 'cancelled', 'processing'].includes(o.status));
    } else if (metric === 'completed') {
      raw = await fetchOrders({ status: 'completed', modifiedAfter: after, modifiedBefore: before });
      raw = raw.filter(o => {
        const d = o.date_completed?.slice(0, 10) ?? '';
        return d >= rangeStart && d <= rangeEnd;
      });
    } else if (metric === 'cancelled') {
      raw = await fetchOrders({ status: 'cancelled', modifiedAfter: after, modifiedBefore: before });
    } else {
      return NextResponse.json({ error: 'Invalid metric' }, { status: 400 });
    }

    const rows: OrderRow[] = raw.map(o => ({
      id: o.id,
      number: o.number,
      status: o.status,
      total: parseFloat(o.total) || 0,
      customer: `${o.billing.first_name} ${o.billing.last_name}`.trim(),
      items: o.line_items.reduce((s, i) => s + (i.quantity || 0), 0),
    }));

    rows.sort((a, b) => b.total - a.total);

    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
