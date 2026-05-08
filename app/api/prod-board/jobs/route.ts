import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const { jo_number, wc_order_id, notes } = await req.json() as {
    jo_number: string; wc_order_id: string; notes?: string;
  };

  if (!jo_number || !wc_order_id) {
    return NextResponse.json({ error: 'jo_number and wc_order_id required' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('job_orders')
    .insert({ jo_number, wc_order_id: String(wc_order_id), notes: notes ?? null, status: 'review' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
