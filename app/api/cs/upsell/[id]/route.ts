import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH: edit a suggestion. Body: partial { suggestion, note, is_active }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updates = await req.json();
  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_upsell_suggestions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: remove a suggestion.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createAdminClient();
  const { error } = await db.from('cs_upsell_suggestions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
