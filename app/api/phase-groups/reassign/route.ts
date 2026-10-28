import { NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/commerce/orders';
import { itemPhaseOf, setItemPhases } from '@/lib/phases/kanban';

// POST { from, to }: move every open item in phase `from` to phase `to`
// (used before deleting a phase).
export async function POST(req: Request) {
  const { from, to } = await req.json() as { from: string; to: string };
  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 });

  try {
    const orders = await fetchOrders({ status: 'processing' });
    const updates = orders.flatMap(o =>
      o.line_items
        .filter(li => itemPhaseOf(o, li.id)?.phase === from)
        .map(li => ({ orderNumber: o.number, lineItemId: li.id, phase: to }))
    );
    if (updates.length) await setItemPhases(updates, 'erp-reassign');
    return NextResponse.json({ ok: true, moved: updates.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
