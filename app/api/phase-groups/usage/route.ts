import { NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/commerce/orders';
import { itemPhaseOf } from '@/lib/phases/kanban';

// GET ?phase=<name>: open order items currently in that phase.
export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (!phase) return NextResponse.json({ error: 'phase param required' }, { status: 400 });

  try {
    const orders = await fetchOrders({ status: 'processing' });
    const items = orders.flatMap(o =>
      o.line_items
        .filter(li => itemPhaseOf(o, li.id)?.phase === phase)
        .map(li => ({ id: `${o.id}-${li.id}`, order_id: String(o.id), line_item_id: String(li.id) }))
    );
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
