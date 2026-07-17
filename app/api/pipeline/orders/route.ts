import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllOrders, mapOrderBase } from '@/lib/woocommerce/orders';

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

export async function GET() {
  try {
    const wcOrders = await fetchAllOrders({ status: 'processing', orderby: 'date', order: 'desc' });
    const db = createAdminClient();

    const orderIds = wcOrders.map((o: any) => String(o.id));

    const { data: phaseRows } = await db
      .from('item_phase')
      .select('order_id, line_item_id, phase')
      .in('order_id', orderIds)
      .order('updated_at', { ascending: true });

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
      await db.from('item_phase').upsert(toPlace, { onConflict: 'order_id,line_item_id' });
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

    const orders: PipelineOrder[] = wcOrders.map((o: any) => {
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

      return { ...mapOrderBase(o, o.date_created), lineItems };
    });

    return NextResponse.json(orders);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
