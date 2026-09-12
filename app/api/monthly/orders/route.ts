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

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month  = searchParams.get('month');   // YYYY-MM
  const metric = searchParams.get('metric');  // created | completed | cancelled

  if (!month || !metric) {
    return NextResponse.json({ error: 'Missing month or metric' }, { status: 400 });
  }

  const [year, mo] = month.split('-').map(Number);
  if (!year || !mo) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
  }

  const lastDay = daysInMonth(year, mo);
  const monthStart = `${year}-${String(mo).padStart(2, '0')}-01`;
  const monthEnd   = `${year}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const after  = `${monthStart}T00:00:00`;
  const before = `${monthEnd}T23:59:59`;

  try {
    let raw: CommerceOrder[] = [];

    if (metric === 'created') {
      raw = await fetchOrders({ after, before });
      raw = raw.filter(o => ['completed', 'cancelled', 'processing'].includes(o.status));
    } else if (metric === 'completed') {
      raw = await fetchOrders({ status: 'completed', modifiedAfter: after, modifiedBefore: before });
      raw = raw.filter(o => o.date_completed?.slice(0, 7) === month);
    } else if (metric === 'cancelled') {
      raw = await fetchOrders({ status: 'cancelled', modifiedAfter: after, modifiedBefore: before });
      raw = raw.filter(o => o.date_modified?.slice(0, 7) === month);
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
