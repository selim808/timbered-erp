import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: list active cancellation reasons, ordered by sort_order.
export async function GET() {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('cancellation_reasons')
      .select('id, label, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    // createAdminClient() throws outright when the Supabase env vars are
    // missing — without this the route 500s with HTML and the caller's
    // r.json() fails on "<", hiding the real cause.
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST: add a reason. Body: { label }
export async function POST(req: Request) {
  try {
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

    if (error) {
      // 23505 = unique violation on label.
      const status = error.code === '23505' ? 409 : 500;
      const message = status === 409 ? 'That reason already exists' : error.message;
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
