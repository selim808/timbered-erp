import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchOrders } from '@/lib/commerce/orders';
import { mapOrderBase } from '@/lib/commerce/map';
import type { CommerceSource } from '@/lib/commerce/types';
import { getStartPhase, itemPhaseOf, seedMissingPhases } from '@/lib/phases/kanban';

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
  source: CommerceSource;
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
  // Set only for the After-Sales / Follow-up (completed orders) feed:
  completedDaysAgo?: number; // days since the order was completed
  leadTimeDays?: number;     // days from order creation to completion
  // Set only for the After-Sales / Cancelled feed:
  cancelledDaysAgo?: number; // days since the order was cancelled
  daysToCancel?: number;     // days from order creation to cancellation
  cancelReason?: string;     // ERP-chosen reason, else Shopify's bucket + note
  cancelTiming?: string;
  cancelImpact?: string;
  // Set only for the Follow-up feed: signed code for the public /g/<code> guarantee link.
  warrantyCode?: string;
  lineItems: PipelineLineItem[];
}

export async function GET() {
  try {
    const wcOrders = await fetchOrders({ status: 'processing' });
    const db = createAdminClient();

    // Every Shopify item without a phase starts in the first phase (stored on the order).
    // A failed seed (e.g. Shopify down) must not hide the pipeline; items just show the start phase.
    try { await seedMissingPhases(wcOrders); }
    catch (e) { console.error('Phase seed failed:', (e as Error).message); }
    const startName = (await getStartPhase())?.name ?? '';

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
        phase: itemPhaseOf(o, li.id)?.phase ?? startName,
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
