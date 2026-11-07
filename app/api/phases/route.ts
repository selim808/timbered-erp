import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: list active phases. Optional ?group_id= filter.
export async function GET(req: Request) {
  const groupId = new URL(req.url).searchParams.get('group_id');
  const db = createAdminClient();
  let q = db
    .from('phases')
    .select('id, phase_group_id, name, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (groupId) q = q.eq('phase_group_id', groupId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: insert a phase. Body: { phase_group_id, name }
export async function POST(req: Request) {
  const { phase_group_id, name } = await req.json() as {
    phase_group_id: string; name: string;
  };
  if (!phase_group_id || !name)
    return NextResponse.json({ error: 'phase_group_id and name required' }, { status: 400 });

  const db = createAdminClient();

  const { data: existing } = await db
    .from('phases')
    .select('sort_order')
    .eq('phase_group_id', phase_group_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const sort_order = (existing?.[0]?.sort_order ?? 0) + 10;

  const { data, error } = await db
    .from('phases')
    .insert({ phase_group_id, name, sort_order, is_active: true })
    .select('id, phase_group_id, name, sort_order')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
