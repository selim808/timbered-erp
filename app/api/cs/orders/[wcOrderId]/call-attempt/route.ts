import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST: log one confirmation-call attempt on an order. Body:
// { outcome: 'no_response' | 'called' | 'confirmed', note?, created_by? }.
// Always bumps call_attempts/last_call_at; the status move (and its history
// row) still goes through cs_set_order_status so the audit log stays complete.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ wcOrderId: string }> }
) {
  const { wcOrderId } = await params;
  const { outcome, note, created_by } = await req.json().catch(() => ({})) as {
    outcome?: string; note?: string; created_by?: string;
  };

  const toStatus = outcome ?? 'no_response';
  const db = createAdminClient();

  const { data: current, error: readErr } = await db
    .from('cs_order_state')
    .select('call_attempts')
    .eq('wc_order_id', wcOrderId)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

  const attempts = (current?.call_attempts ?? 0) + 1;

  const { error: statusErr } = await db.rpc('cs_set_order_status', {
    p_wc_order_id: wcOrderId,
    p_new_status: toStatus,
    p_note: note?.trim() || `Call attempt ${attempts}: ${toStatus.replace('_', ' ')}`,
    p_created_by: created_by ?? null,
  });
  if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 500 });

  const { data, error } = await db
    .from('cs_order_state')
    .update({ call_attempts: attempts, last_call_at: new Date().toISOString() })
    .eq('wc_order_id', wcOrderId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
