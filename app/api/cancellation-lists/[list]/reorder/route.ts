import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { tableFor } from '../../_tables';

// PUT: set sort_order by position. Body: { ordered_ids: string[] }
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ list: string }> }
) {
  const table = tableFor((await params).list);
  if (!table) return NextResponse.json({ error: 'unknown list' }, { status: 404 });

  const { ordered_ids } = await req.json() as { ordered_ids: string[] };
  if (!Array.isArray(ordered_ids))
    return NextResponse.json({ error: 'ordered_ids required' }, { status: 400 });

  const db = createAdminClient();
  const results = await Promise.all(
    ordered_ids.map((id, i) =>
      db.from(table).update({ sort_order: (i + 1) * 10 }).eq('id', id)
    )
  );
  const firstErr = results.find(r => r.error)?.error;
  if (firstErr) return NextResponse.json({ error: firstErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
