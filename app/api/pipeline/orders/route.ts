import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import wc from '@/lib/woocommerce/client';

export interface PipelineLineItem {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
  imageUrl: string;
  phase: string;
}

export interface PipelineOrder {
  id: number;
  number: string;
  dateCreated: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerNote: string;
  total: number;
  daysOpen: number;
  lineItems: PipelineLineItem[];
}

async function fetchAllProcessing(): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const { data } = await wc.get('/orders', {
      params: { status: 'processing', orderby: 'date', order: 'desc', per_page: 100, page },
    });
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

export async function GET() {
  try {
    const wcOrders = await fetchAllProcessing();
    const db = createAdminClient();

    const orderIds = wcOrders.map((o: any) => String(o.id));

    const { data: phaseRows } = await db
      .from('order_phases')
      .select('order_id, line_item_id, phase')
      .in('order_id', orderIds);

    const phaseMap = new Map<string, string>();
    (phaseRows ?? []).forEach((r: any) => {
      phaseMap.set(`${r.order_id}-${r.line_item_id}`, r.phase);
    });

    const now = Date.now();
    const orders: PipelineOrder[] = wcOrders.map((o: any) => {
      const daysOpen = Math.floor((now - new Date(o.date_created).getTime()) / 86400000);
      const lineItems: PipelineLineItem[] = (o.line_items ?? []).map((li: any) => ({
        id: li.id,
        productId: li.product_id,
        name: li.name,
        quantity: li.quantity,
        price: parseFloat(li.price ?? '0'),
        total: parseFloat(li.total ?? '0'),
        imageUrl: li.image?.src ?? '',
        phase: phaseMap.get(`${o.id}-${li.id}`) ?? '',
      }));

      return {
        id: o.id,
        number: o.number,
        dateCreated: o.date_created,
        customerName: `${o.billing?.first_name ?? ''} ${o.billing?.last_name ?? ''}`.trim(),
        customerPhone: o.billing?.phone ?? '',
        customerAddress: o.billing?.address_1 ?? '',
        customerCity: o.billing?.city ?? '',
        customerState: o.billing?.state ?? '',
        customerNote: o.customer_note ?? '',
        total: parseFloat(o.total ?? '0'),
        daysOpen,
        lineItems,
      };
    });

    return NextResponse.json(orders);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
