import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PUT: set sort_order on every phase in a group by position.
// Body: { ordered_ids: string[] }
export async function PUT(req: Request) {
  const { ordered_ids } = await req.json() as { ordered_ids: string[] };
  if (!Array.isArray(ordered_ids))
    return NextResponse.json({ error: 'ordered_ids required' }, { status: 400 });

  const db = createAdminClient();
  const updates = ordered_ids.map((id, i) =>
    db.from('phases').update({ sort_order: (i + 1) * 10 }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const firstErr = results.find(r => r.error)?.error;
  if (firstErr) return NextResponse.json({ error: firstErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
