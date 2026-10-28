import { NextResponse } from 'next/server';
import { setItemPhases } from '@/lib/phases/kanban';

// PATCH: move one item of an order to a phase.
// [id] is the order number. Body: { lineItemId, phase } (phase name or id from Supabase).
// Saved on the Shopify order (metafield timbered.kanban_phase) with history.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { lineItemId, phase } = await req.json() as { lineItemId: string; phase: string };

  if (!lineItemId || !phase) {
    return NextResponse.json({ error: 'lineItemId and phase required' }, { status: 400 });
  }

  try {
    await setItemPhases([{ orderNumber: id, lineItemId, phase }], 'erp');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
