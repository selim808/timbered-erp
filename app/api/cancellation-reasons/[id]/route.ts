import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// DELETE: remove a cancellation reason. Existing WC orders keep their stored
// reason text, so a hard delete here doesn't affect past cancellations.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createAdminClient();
  const { error } = await db.from('cancellation_reasons').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
