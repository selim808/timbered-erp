import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_product_issue_flags')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST body: { product_id, product_name?, issue_summary, severity?, linked_issue_id?, created_by? }
export async function POST(req: Request) {
  const body = await req.json() as {
    product_id: string; product_name?: string; issue_summary: string;
    severity?: string; linked_issue_id?: string; created_by?: string;
  };
  if (!body.product_id || !body.issue_summary?.trim()) {
    return NextResponse.json({ error: 'product_id and issue_summary required' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_product_issue_flags')
    .insert({
      product_id: body.product_id,
      product_name: body.product_name ?? null,
      issue_summary: body.issue_summary.trim(),
      severity: body.severity ?? 'medium',
      linked_issue_id: body.linked_issue_id ?? null,
      created_by: body.created_by ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
