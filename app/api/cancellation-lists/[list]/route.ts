import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { tableFor } from '../_tables';

type Ctx = { params: Promise<{ list: string }> };

// GET: active entries of one list (reasons | timing | impact), by sort_order.
export async function GET(_req: Request, { params }: Ctx) {
  const table = tableFor((await params).list);
  if (!table) return NextResponse.json({ error: 'unknown list' }, { status: 404 });

  const db = createAdminClient();
  const { data, error } = await db
    .from(table)
    .select('id, label, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: add an entry. Body: { label }
export async function POST(req: Request, { params }: Ctx) {
  const table = tableFor((await params).list);
  if (!table) return NextResponse.json({ error: 'unknown list' }, { status: 404 });

  const { label } = await req.json() as { label: string };
  const trimmed = (label ?? '').trim();
  if (!trimmed) return NextResponse.json({ error: 'label required' }, { status: 400 });

  const db = createAdminClient();
  const { data: existing } = await db
    .from(table)
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  const sort_order = (existing?.[0]?.sort_order ?? 0) + 10;

  const { data, error } = await db
    .from(table)
    .insert({ label: trimmed, sort_order, is_active: true })
    .select('id, label, sort_order')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
