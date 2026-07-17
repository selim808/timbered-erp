import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: active upsell suggestions. Optional ?product_id= filter for the Call
// Queue detail panel; no filter returns everything for the management list.
export async function GET(req: Request) {
  const productId = new URL(req.url).searchParams.get('product_id');
  const db = createAdminClient();
  let q = db.from('cs_upsell_suggestions').select('*').eq('is_active', true).order('sort_order', { ascending: true });
  if (productId) q = q.eq('product_id', productId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST body: { product_id, suggestion, note? }
export async function POST(req: Request) {
  const { product_id, suggestion, note } = await req.json() as {
    product_id: string; suggestion: string; note?: string;
  };
  if (!product_id || !suggestion?.trim()) {
    return NextResponse.json({ error: 'product_id and suggestion required' }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: existing } = await db
    .from('cs_upsell_suggestions')
    .select('sort_order')
    .eq('product_id', product_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const sort_order = (existing?.[0]?.sort_order ?? 0) + 10;

  const { data, error } = await db
    .from('cs_upsell_suggestions')
    .insert({ product_id, suggestion: suggestion.trim(), note: note ?? null, sort_order, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
