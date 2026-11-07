import { NextResponse } from 'next/server';
import { itemPhaseOf } from '@/lib/phases/kanban';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchOrders } from '@/lib/commerce/orders';
import { mapOrderBase } from '@/lib/commerce/map';
import type { PipelineLineItem } from '@/app/api/pipeline/orders/route';

export interface CsLineItem extends PipelineLineItem {
  phaseUpdatedAt: string | null;
}

export interface CsOrder {
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
  lineItems: CsLineItem[];
  csStatus: string;
  depositRequired: boolean;
  depositAmount: number | null;
  depositPaidAt: string | null;
  deliveredAt: string | null;
  upsellOffered: boolean;
  upsellAccepted: boolean | null;
  upsellNote: string | null;
}

// GET: WC "processing" orders enriched with cs_order_state + current
// production phase (Shopify metafield).
// Any order without a cs_order_state row yet is lazily seeded as 'new',
// mirroring the phase auto-seed in app/api/pipeline/orders/route.ts.
export async function GET() {
  try {
    const wcOrders = await fetchOrders({ status: 'processing' });
    const db = createAdminClient();
    const orderIds = wcOrders.map((o: any) => String(o.id));

    const [{ data: csRows }, { data: stockRows }] = await Promise.all([
      db.from('cs_order_state').select('*').in('wc_order_id', orderIds),
      db.from('stockcount').select('product_id, stock').in(
        'product_id',
        [...new Set(wcOrders.flatMap((o: any) => (o.line_items ?? []).map((li: any) => li.product_id as number)))]
      ),
    ]);

    const csMap = new Map<string, any>();
    (csRows ?? []).forEach((r: any) => csMap.set(r.wc_order_id, r));
    const toSeed = orderIds.filter(id => !csMap.has(id));
    if (toSeed.length > 0) {
      const { data: seeded } = await db
        .from('cs_order_state')
        .upsert(toSeed.map(id => ({ wc_order_id: id })), { onConflict: 'wc_order_id' })
        .select('*');
      (seeded ?? []).forEach((r: any) => csMap.set(r.wc_order_id, r));
    }



    const stockMap = new Map<number, number>();
    (stockRows ?? []).forEach((r: any) => stockMap.set(Number(r.product_id), r.stock ?? 0));

    const orders: CsOrder[] = wcOrders.map((o: any) => {
      const cs = csMap.get(String(o.id));
      const lineItems: CsLineItem[] = (o.line_items ?? []).map((li: any) => {
        const entry = itemPhaseOf(o, li.id);
        return {
          id: li.id,
          productId: li.product_id,
          name: li.name,
          quantity: li.quantity,
          price: parseFloat(li.price ?? '0'),
          total: parseFloat(li.total ?? '0'),
          imageUrl: li.image?.src ?? '',
          phase: entry?.phase ?? '',
          stock: stockMap.get(li.product_id) ?? 0,
          orderedQty: li.quantity,
          phaseUpdatedAt: entry?.updatedAt ?? null,
        };
      });

      return {
        ...mapOrderBase(o, o.date_created),
        lineItems,
        csStatus: cs?.cs_status ?? 'new',
        depositRequired: cs?.deposit_required ?? false,
        depositAmount: cs?.deposit_amount ?? null,
        depositPaidAt: cs?.deposit_paid_at ?? null,
        deliveredAt: cs?.delivered_at ?? null,
        upsellOffered: cs?.upsell_offered ?? false,
        upsellAccepted: cs?.upsell_accepted ?? null,
        upsellNote: cs?.upsell_note ?? null,
      };
    });

    return NextResponse.json(orders);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
