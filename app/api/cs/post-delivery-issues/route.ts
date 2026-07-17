import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_post_delivery_issues')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST body: { wc_order_id, product_id?, product_name?, issue_type, description, created_by? }
export async function POST(req: Request) {
  const body = await req.json() as {
    wc_order_id: string; product_id?: string; product_name?: string;
    issue_type: string; description: string; created_by?: string;
  };
  if (!body.wc_order_id || !body.issue_type || !body.description?.trim()) {
    return NextResponse.json({ error: 'wc_order_id, issue_type and description required' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_post_delivery_issues')
    .insert({
      wc_order_id: body.wc_order_id,
      product_id: body.product_id ?? null,
      product_name: body.product_name ?? null,
      issue_type: body.issue_type,
      description: body.description.trim(),
      created_by: body.created_by ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
