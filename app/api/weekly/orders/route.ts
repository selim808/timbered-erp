import { NextResponse } from 'next/server';
import wcClient from '@/lib/woocommerce/client';

interface WCOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  date_created: string;
  date_completed: string | null;
  date_modified: string;
  billing: { first_name: string; last_name: string };
  line_items: { quantity: number }[];
}

export interface OrderRow {
  id: number;
  number: string;
  status: string;
  total: number;
  customer: string;
  items: number;
}

async function fetchAll(params: Record<string, string | number>): Promise<WCOrder[]> {
  const results: WCOrder[] = [];
  let page = 1;
  while (true) {
    const res = await wcClient.get('/orders', { params: { ...params, per_page: 100, page } });
    const batch = res.data as WCOrder[];
    if (!batch.length) break;
    results.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date   = searchParams.get('date');    // YYYY-MM-DD
  const metric = searchParams.get('metric');  // created | completed | cancelled

  if (!date || !metric) {
    return NextResponse.json({ error: 'Missing date or metric' }, { status: 400 });
  }

  const after  = `${date}T00:00:00`;
  const before = `${date}T23:59:59`;

  try {
    let raw: WCOrder[] = [];

    if (metric === 'created') {
      raw = await fetchAll({ after, before, status: 'any', orderby: 'date', order: 'desc' });
      raw = raw.filter(o => ['completed', 'cancelled', 'processing'].includes(o.status));
    } else if (metric === 'completed') {
      raw = await fetchAll({ modified_after: after, modified_before: before, status: 'completed' });
      raw = raw.filter(o => o.date_completed?.slice(0, 10) === date);
    } else if (metric === 'cancelled') {
      raw = await fetchAll({ modified_after: after, modified_before: before, status: 'cancelled' });
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
