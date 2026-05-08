import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { lineItemId, phase } = await req.json() as { lineItemId: string; phase: string };

  if (!lineItemId || phase === undefined) {
    return NextResponse.json({ error: 'lineItemId and phase required' }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from('order_phases').upsert(
    { order_id: id, line_item_id: String(lineItemId), phase, updated_at: new Date().toISOString() },
    { onConflict: 'order_id,line_item_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
