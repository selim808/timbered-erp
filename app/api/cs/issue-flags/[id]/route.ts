import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH body: { status?, severity? } — management marks reviewed/resolved.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { status?: string; severity?: string };

  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_product_issue_flags')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
