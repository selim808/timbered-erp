import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_returns')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST body: { wc_order_id, type, reason, note?, created_by? }
export async function POST(req: Request) {
  const body = await req.json() as {
    wc_order_id: string; type: string; reason: string; note?: string; created_by?: string;
  };
  if (!body.wc_order_id || !body.type || !body.reason?.trim()) {
    return NextResponse.json({ error: 'wc_order_id, type and reason required' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_returns')
    .insert({
      wc_order_id: body.wc_order_id,
      type: body.type,
      reason: body.reason.trim(),
      note: body.note ?? null,
      created_by: body.created_by ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
