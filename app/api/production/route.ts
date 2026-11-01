import { NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/commerce/orders';
import { getActivePhases } from '@/lib/phases/kanban';

interface Phase {
  Phases: string;
  /** Supabase phase group (Confirmation, Planning, Production, Warehouse, Delivery, After-sales). */
  Group: string;
  Value: number;
  Items: number;
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
    for (const p of active) byName.set(p.name, { Phases: p.name, Group: p.group, Value: 0, Items: 0 });
    const bucket = (name: string) => {
      let b = byName.get(name);
      if (!b) { b = { Phases: name, Group: name === NO_PHASE ? NO_PHASE : 'Other', Value: 0, Items: 0 }; byName.set(name, b); }
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
        const name = o.kanban?.[String(li.id)]?.phase || NO_PHASE;
        if (name === NO_PHASE) unphasedItems += qty;
        const b = bucket(name);
        b.Value += orderTotal * share;
        b.Items += qty;
      });
    }

    const phases = [...byName.values()].map(p => ({ ...p, Value: Math.round(p.Value) }));
    return NextResponse.json({
      phases,
      ordersNo: orders.length,
      itemsNo,
      procValue: Math.round(procValue),
      unphasedItems,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
