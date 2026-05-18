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
  stock: number;
  orderedQty: number;
}

export interface PipelineOrder {
  id: number;
  number: string;
  dateCreated: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerAddress2: string;
  customerCity: string;
  customerState: string;
  customerNote: string;
  total: number;
  daysOpen: number;
  lineItems: PipelineLineItem[];
}

const EG_STATES: Record<string, string> = {
  '0':'Alexandria','1':'Assuit','2':'Aswan','3':'Bani Suif','4':'Behira',
  '5':'Cairo','6':'Dakahlia','7':'Damietta','8':'El Kalioubia','9':'Fayoum',
  '10':'Gharbia','11':'Giza','12':'Ismailia','13':'Kafr Alsheikh','14':'Luxor',
  '15':'Matrouh','16':'Menya','17':'Monufia','18':'New Valley','19':'North Coast',
  '21':'Port Said','22':'Qena','23':'Red Sea','24':'Sharqia','25':'Sohag',
  '26':'South Sinai','27':'Suez',
};

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
      .from('item_phase')
      .select('order_id, line_item_id, phase')
      .in('order_id', orderIds);

    const phaseMap = new Map<string, string>();
    (phaseRows ?? []).forEach((r: any) => {
      phaseMap.set(`${r.order_id}-${r.line_item_id}`, r.phase);
    });

    // Auto-save 'placed' for any item with no phase yet
    const toPlace: { order_id: string; line_item_id: string; phase: string }[] = [];
    wcOrders.forEach((o: any) => {
      (o.line_items ?? []).forEach((li: any) => {
        const key = `${o.id}-${li.id}`;
        if (!phaseMap.get(key)) {
          phaseMap.set(key, 'Placed');
          toPlace.push({ order_id: String(o.id), line_item_id: String(li.id), phase: 'Placed' });
        }
      });
    });
    if (toPlace.length > 0) {
      await db.from('item_phase').insert(toPlace);
    }

    // Stock per product
    const productIds = [...new Set(wcOrders.flatMap((o: any) => (o.line_items ?? []).map((li: any) => li.product_id as number)))];
    const { data: stockRows } = await db.from('stockcount').select('product_id, stock').in('product_id', productIds);
    const stockMap = new Map<number, number>();
    (stockRows ?? []).forEach((r: any) => stockMap.set(Number(r.product_id), r.stock ?? 0));

    // Total ordered qty per product across all active orders
    const orderedQtyMap = new Map<number, number>();
    wcOrders.forEach((o: any) => {
      (o.line_items ?? []).forEach((li: any) => {
        orderedQtyMap.set(li.product_id, (orderedQtyMap.get(li.product_id) ?? 0) + (li.quantity ?? 0));
      });
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
        phase: phaseMap.get(`${o.id}-${li.id}`) ?? 'Placed',
        stock: stockMap.get(li.product_id) ?? 0,
        orderedQty: orderedQtyMap.get(li.product_id) ?? li.quantity,
      }));

      return {
        id: o.id,
        number: o.number,
        dateCreated: o.date_created,
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

    return NextResponse.json(orders);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
