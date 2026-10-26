import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { tableFor } from '../../_tables';

// DELETE: remove one entry. Past cancellations keep their stored text.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ list: string; id: string }> }
) {
  const { list, id } = await params;
  const table = tableFor(list);
  if (!table) return NextResponse.json({ error: 'unknown list' }, { status: 404 });

  const db = createAdminClient();
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
