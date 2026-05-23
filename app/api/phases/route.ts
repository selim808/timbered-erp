import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST: add a phase to a group. Body: { group_id, name }
export async function POST(req: Request) {
  const { group_id, name } = await req.json() as { group_id: string; name: string };
  if (!group_id || !name) return NextResponse.json({ error: 'group_id and name required' }, { status: 400 });

  const db = createAdminClient();

  const { data: existing } = await db
    .from('phases')
    .select('sort_order')
    .eq('phase_group_id', group_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const next_sort = ((existing?.[0]?.sort_order ?? 0) + 10);

  const { data, error } = await db
    .from('phases')
    .insert({ phase_group_id: group_id, name, sort_order: next_sort, is_active: true })
    .select('id, name, sort_order')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH: rename a phase. Body: { group_id, old_name, new_name }
export async function PATCH(req: Request) {
  const { group_id, old_name, new_name } = await req.json() as {
    group_id: string; old_name: string; new_name: string;
  };
  if (!group_id || !old_name || !new_name)
    return NextResponse.json({ error: 'group_id, old_name, new_name required' }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from('phases')
    .update({ name: new_name })
    .eq('phase_group_id', group_id)
    .eq('name', old_name);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: remove a phase. Body: { group_id, name }
export async function DELETE(req: Request) {
  const { group_id, name } = await req.json() as { group_id: string; name: string };
  if (!group_id || !name) return NextResponse.json({ error: 'group_id and name required' }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db
    .from('phases')
    .delete()
    .eq('phase_group_id', group_id)
    .eq('name', name);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
