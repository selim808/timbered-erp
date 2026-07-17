import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wcOrderId: string }> }
) {
  const { wcOrderId } = await params;
  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_notes')
    .select('*')
    .eq('wc_order_id', wcOrderId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ wcOrderId: string }> }
) {
  const { wcOrderId } = await params;
  const { note, created_by } = await req.json() as { note: string; created_by?: string };
  const trimmed = (note ?? '').trim();
  if (!trimmed) return NextResponse.json({ error: 'note required' }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_notes')
    .insert({ wc_order_id: wcOrderId, note: trimmed, created_by: created_by ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
