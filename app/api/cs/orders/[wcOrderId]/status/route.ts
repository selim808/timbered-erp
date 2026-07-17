import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH: move an order through the CS workflow. History is written by the
// cs_set_order_status() Postgres function + trigger (see the CS module
// migration) — this route never inserts into cs_status_history directly.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ wcOrderId: string }> }
) {
  const { wcOrderId } = await params;
  const { to_status, note, created_by } = await req.json() as {
    to_status: string; note?: string; created_by?: string;
  };

  if (!to_status) return NextResponse.json({ error: 'to_status required' }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db.rpc('cs_set_order_status', {
    p_wc_order_id: wcOrderId,
    p_new_status: to_status,
    p_note: note ?? null,
    p_created_by: created_by ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
