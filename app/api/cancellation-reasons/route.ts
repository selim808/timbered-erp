import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: list active cancellation reasons, ordered by sort_order.
export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('cancellation_reasons')
    .select('id, label, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: add a reason. Body: { label }
export async function POST(req: Request) {
  const { label } = await req.json() as { label: string };
  const trimmed = (label ?? '').trim();
  if (!trimmed) return NextResponse.json({ error: 'label required' }, { status: 400 });

  const db = createAdminClient();

  const { data: existing } = await db
    .from('cancellation_reasons')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const sort_order = (existing?.[0]?.sort_order ?? 0) + 10;

  const { data, error } = await db
    .from('cancellation_reasons')
    .insert({ label: trimmed, sort_order, is_active: true })
    .select('id, label, sort_order')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
