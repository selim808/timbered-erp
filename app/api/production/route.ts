import { NextResponse } from 'next/server';
import wcClient from '@/lib/woocommerce/client';

interface WCOrder {
  total: string;
  line_items: { quantity: number }[];
}

async function fetchProcessing() {
  let page = 1, ordersNo = 0, itemsNo = 0, procValue = 0;
  while (true) {
    const res    = await wcClient.get('/orders', { params: { status: 'processing', per_page: 100, page } });
    const orders = res.data as WCOrder[];
    if (!orders.length) break;
    ordersNo += orders.length;
    orders.forEach(o => {
      (o.line_items || []).forEach(i => { itemsNo += i.quantity || 1; });
      procValue += parseFloat(o.total) || 0;
    });
    if (orders.length < 100) break;
    page++;
  }
  return { ordersNo, itemsNo, procValue: Math.round(procValue) };
}

export async function GET() {
  const url = process.env.PROD_API_URL;
  if (!url) return NextResponse.json({ error: 'PROD_API_URL not configured' }, { status: 500 });

  try {
    const [prodRes, wc] = await Promise.all([
      fetch(url, { next: { revalidate: 300 } }),
      fetchProcessing(),
    ]);
    const phases = await prodRes.json();
    return NextResponse.json({ phases, ...wc });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
