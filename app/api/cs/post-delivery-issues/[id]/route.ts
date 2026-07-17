import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH body: { status } — 'open' | 'in_review' | 'resolved'. Stamps resolved_at when resolved.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json() as { status: string };
  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 });

  const db = createAdminClient();
  const updates: Record<string, unknown> = { status };
  if (status === 'resolved') updates.resolved_at = new Date().toISOString();

  const { data, error } = await db
    .from('cs_post_delivery_issues')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
