import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOwnerRequest, listPublicTables } from '@/lib/supabase/tables';

const MAX_ROWS = 1000;

// GET: rows of one table, read-only (owner only). Only tables in the public schema are allowed.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { table } = await params;
  let tables;
  try {
    tables = await listPublicTables();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
  const info = tables.find(t => t.name === table);
  if (!info) return NextResponse.json({ error: 'unknown table' }, { status: 404 });

  let q = createAdminClient().from(table).select('*', { count: 'exact' }).limit(MAX_ROWS);
  if (info.columns.includes('sort_order')) q = q.order('sort_order', { ascending: true });
  else if (info.columns.includes('created_at')) q = q.order('created_at', { ascending: false });

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ columns: info.columns, rows: data ?? [], total: count ?? 0, limit: MAX_ROWS });
}
