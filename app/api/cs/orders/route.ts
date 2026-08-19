import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllOrders, mapOrderBase } from '@/lib/woocommerce/orders';
import type { PipelineLineItem } from '@/app/api/pipeline/orders/route';

export interface CsLineItem extends PipelineLineItem {
  phaseUpdatedAt: string | null;
  expectedDays: number | null;
  daysInPhase: number | null;
  isDelayed: boolean;
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
  callAttempts: number;
  lastCallAt: string | null;
  depositRequired: boolean;
  depositAmount: number | null;
  depositPaidAt: string | null;
  deliveredAt: string | null;
  upsellOffered: boolean;
  upsellAccepted: boolean | null;
  upsellNote: string | null;
  isDelayed: boolean;
}

// GET: WC "processing" orders enriched with cs_order_state + current
// production phase + per-phase delay threshold (phases.expected_days).
// Any order without a cs_order_state row yet is lazily seeded as 'new',
// mirroring item_phase's auto-seed in app/api/pipeline/orders/route.ts.
export async function GET() {
  try {
    const wcOrders = await fetchAllOrders({ status: 'processing', orderby: 'date', order: 'desc' });
    const db = createAdminClient();
    const orderIds = wcOrders.map((o: any) => String(o.id));

    const [{ data: phaseRows }, { data: csRows }, { data: phases }, { data: stockRows }] = await Promise.all([
      db.from('item_phase').select('order_id, line_item_id, phase, updated_at').in('order_id', orderIds),
      db.from('cs_order_state').select('*').in('wc_order_id', orderIds),
      db.from('phases').select('name, expected_days').eq('is_active', true),
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

    const expectedDaysByPhase = new Map<string, number>();
    (phases ?? []).forEach((p: any) => {
      if (p.expected_days != null) expectedDaysByPhase.set(p.name, p.expected_days);
    });

    const phaseMap = new Map<string, { phase: string; updatedAt: string }>();
    (phaseRows ?? []).forEach((r: any) => {
      phaseMap.set(`${r.order_id}-${r.line_item_id}`, { phase: r.phase, updatedAt: r.updated_at });
    });

    const stockMap = new Map<number, number>();
    (stockRows ?? []).forEach((r: any) => stockMap.set(Number(r.product_id), r.stock ?? 0));

    const now = Date.now();
    const orders: CsOrder[] = wcOrders.map((o: any) => {
      const cs = csMap.get(String(o.id));
      const lineItems: CsLineItem[] = (o.line_items ?? []).map((li: any) => {
        const entry = phaseMap.get(`${o.id}-${li.id}`);
        const expectedDays = entry ? expectedDaysByPhase.get(entry.phase) ?? null : null;
        const daysInPhase = entry ? Math.floor((now - new Date(entry.updatedAt).getTime()) / 86400000) : null;
        const isDelayed = expectedDays != null && daysInPhase != null && daysInPhase > expectedDays;
        return {
          id: li.id,
          productId: li.product_id,
          name: li.name,
          quantity: li.quantity,
          price: parseFloat(li.price ?? '0'),
          total: parseFloat(li.total ?? '0'),
          imageUrl: li.image?.src ?? '',
          phase: entry?.phase ?? 'Placed',
          stock: stockMap.get(li.product_id) ?? 0,
          orderedQty: li.quantity,
          phaseUpdatedAt: entry?.updatedAt ?? null,
          expectedDays,
          daysInPhase,
          isDelayed,
        };
      });

      return {
        ...mapOrderBase(o, o.date_created),
        lineItems,
        csStatus: cs?.cs_status ?? 'new',
        callAttempts: cs?.call_attempts ?? 0,
        lastCallAt: cs?.last_call_at ?? null,
        depositRequired: cs?.deposit_required ?? false,
        depositAmount: cs?.deposit_amount ?? null,
        depositPaidAt: cs?.deposit_paid_at ?? null,
        deliveredAt: cs?.delivered_at ?? null,
        upsellOffered: cs?.upsell_offered ?? false,
        upsellAccepted: cs?.upsell_accepted ?? null,
        upsellNote: cs?.upsell_note ?? null,
        isDelayed: lineItems.some(li => li.isDelayed),
      };
    });

    return NextResponse.json(orders);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
