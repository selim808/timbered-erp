import { NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/commerce/orders';
import { getActivePhases } from '@/lib/phases/kanban';
import { mapOrderBase } from '@/lib/commerce/map';
import type { PipelineOrder } from '@/app/api/pipeline/orders/route';

/** One item sitting in a phase, for the click-through list on the WIP chart. */
export interface WipRow {
  orderNumber: string;
  customer: string;
  item: string;
  qty: number;
  /** This item's share of the order total. */
  value: number;
  /** When the item entered its current phase (null when it has none). */
  since: string | null;
  /** When the order was placed. */
  ordered: string;
}

interface Phase {
  Phases: string;
  /** Supabase phase group (Confirmation, Planning, Production, Warehouse, Delivery, After-sales). */
  Group: string;
  Value: number;
  Items: number;
  Rows: WipRow[];
}

const NO_PHASE = 'No phase';

// ── WIP breakdown source ────────────────────────────────────────────
// Built from the item kanban phases stored on each processing order
// (Shopify metafield timbered.kanban_phase; Woo order meta for old orders).
// Each order's total is spread over its items by line value, so the WIP total
// matches the Processing Value. Phase order comes from the Supabase phase list.
export async function GET() {
  try {
    const [orders, active] = await Promise.all([
      fetchOrders({ status: 'processing' }),
      getActivePhases(),
    ]);

    const byName = new Map<string, Phase>();
    for (const p of active) byName.set(p.name, { Phases: p.name, Group: p.group, Value: 0, Items: 0, Rows: [] });
    const bucket = (name: string) => {
      let b = byName.get(name);
      if (!b) { b = { Phases: name, Group: name === NO_PHASE ? NO_PHASE : 'Other', Value: 0, Items: 0, Rows: [] }; byName.set(name, b); }
      return b;
    };

    let itemsNo = 0, procValue = 0, unphasedItems = 0;
    for (const o of orders) {
      const orderTotal = parseFloat(o.total) || 0;
      procValue += orderTotal;
      const lines = o.line_items;
      const lineVals = lines.map(li => parseFloat(li.total) || (li.price || 0) * (li.quantity || 1));
      const sum = lineVals.reduce((s, v) => s + v, 0);

      lines.forEach((li, idx) => {
        const qty = li.quantity || 1;
        itemsNo += qty;
        const share = sum > 0 ? lineVals[idx] / sum : 1 / lines.length;
        const entry = o.kanban?.[String(li.id)];
        const name = entry?.phase || NO_PHASE;
        if (name === NO_PHASE) unphasedItems += qty;
        const b = bucket(name);
        b.Value += orderTotal * share;
        b.Items += qty;
        b.Rows.push({
          orderNumber: String(o.number || o.id),
          customer: `${o.billing.first_name} ${o.billing.last_name}`.trim(),
          item: li.name,
          qty,
          value: Math.round(orderTotal * share),
          since: entry?.phase ? entry.updated_at : null,
          ordered: o.date_created,
        });
      });
    }

    // Longest-waiting items first; unphased ones (no date) go by order number.
    // Full orders for the shared order-details sheet opened from the phase list.
    const detailOrders: PipelineOrder[] = orders.map(o => ({
      ...mapOrderBase(o, o.date_created),
      lineItems: o.line_items.map(li => ({
        id: li.id,
        productId: li.product_id,
        name: li.name,
        quantity: li.quantity,
        price: li.price,
        total: parseFloat(li.total) || 0,
        imageUrl: li.image?.src ?? '',
        phase: o.kanban?.[String(li.id)]?.phase ?? '',
        stock: 0,
        orderedQty: li.quantity,
      })),
    }));

    const phases = [...byName.values()].map(p => ({
      ...p,
      Value: Math.round(p.Value),
      Rows: p.Rows.sort((a, b) => (a.since ?? '').localeCompare(b.since ?? '') || a.orderNumber.localeCompare(b.orderNumber)),
    }));
    return NextResponse.json({
      phases,
      orders: detailOrders,
      ordersNo: orders.length,
      itemsNo,
      procValue: Math.round(procValue),
      unphasedItems,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
