import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PipelineOrder, PipelineLineItem } from '@/app/api/pipeline/orders/route';

const EG_STATES: Record<string, string> = {
  '0':'Alexandria','1':'Assuit','2':'Aswan','3':'Bani Suif','4':'Behira',
  '5':'Cairo','6':'Dakahlia','7':'Damietta','8':'El Kalioubia','9':'Fayoum',
  '10':'Gharbia','11':'Giza','12':'Ismailia','13':'Kafr Alsheikh','14':'Luxor',
  '15':'Matrouh','16':'Menya','17':'Monufia','18':'New Valley','19':'North Coast',
  '21':'Port Said','22':'Qena','23':'Red Sea','24':'Sharqia','25':'Sohag',
  '26':'South Sinai','27':'Suez',
};

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

    const now = Date.now();
    const orders: PipelineOrder[] = data.map((o: any) => {
      const completedAt = o.date_completed ?? o.date_modified ?? o.date_created;
      const daysOpen = Math.floor((now - new Date(completedAt).getTime()) / 86400000);
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

      return {
        id: o.id,
        number: o.number,
        dateCreated: completedAt,
        customerName: `${o.billing?.first_name ?? ''} ${o.billing?.last_name ?? ''}`.trim(),
        customerPhone: o.billing?.phone ?? '',
        customerAddress: o.billing?.address_1 ?? '',
        customerAddress2: o.billing?.address_2 ?? '',
        customerCity: o.billing?.city ?? '',
        customerState: EG_STATES[o.billing?.state] ?? o.billing?.state ?? '',
        customerNote: o.customer_note ?? '',
        total: parseFloat(o.total ?? '0'),
        daysOpen,
        lineItems,
      };
    });

    const body: CompletedOrdersResponse = { orders, page, totalPages, total, perPage: PER_PAGE };
    return NextResponse.json(body);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
