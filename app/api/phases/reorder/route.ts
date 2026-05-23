import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PUT: set sort_order on every phase in a group by position.
// Body: { group_id, ordered_names: string[] }
export async function PUT(req: Request) {
  const { group_id, ordered_names } = await req.json() as {
    group_id: string; ordered_names: string[];
  };
  if (!group_id || !Array.isArray(ordered_names))
    return NextResponse.json({ error: 'group_id and ordered_names required' }, { status: 400 });

  const db = createAdminClient();

  const updates = ordered_names.map((name, i) =>
    db.from('phases')
      .update({ sort_order: (i + 1) * 10 })
      .eq('phase_group_id', group_id)
      .eq('name', name)
  );
  const results = await Promise.all(updates);
  const firstErr = results.find(r => r.error)?.error;
  if (firstErr) return NextResponse.json({ error: firstErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
