import { NextResponse } from 'next/server';
import { isOwnerRequest, listPublicTables } from '@/lib/supabase/tables';

// GET: tables available on the Lists page (owner only, read-only).
export async function GET() {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await listPublicTables());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
