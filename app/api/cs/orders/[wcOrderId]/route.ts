import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: cs_order_state + status history + notes for one order — powers the
// Call Queue detail panel.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wcOrderId: string }> }
) {
  const { wcOrderId } = await params;
  const db = createAdminClient();

  const [{ data: state, error: e1 }, { data: history, error: e2 }, { data: notes, error: e3 }] = await Promise.all([
    db.from('cs_order_state').select('*').eq('wc_order_id', wcOrderId).maybeSingle(),
    db.from('cs_status_history').select('*').eq('wc_order_id', wcOrderId).order('created_at', { ascending: false }),
    db.from('cs_notes').select('*').eq('wc_order_id', wcOrderId).order('created_at', { ascending: false }),
  ]);

  const err = e1 ?? e2 ?? e3;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  return NextResponse.json({
    state: state ?? { wc_order_id: wcOrderId, cs_status: 'new' },
    history: history ?? [],
    notes: notes ?? [],
  });
}
