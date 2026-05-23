import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('phase_groups')
    .select('id, name, sort_order, phases(name, sort_order, is_active)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type PhaseRow = { name: string; sort_order: number; is_active: boolean };
  const shaped = (data ?? []).map(g => {
    const phases = ((g.phases ?? []) as PhaseRow[])
      .filter(p => p.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(p => p.name);
    return { id: g.id, name: g.name, sort_order: g.sort_order, phases };
  });
  return NextResponse.json(shaped);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, sort_order } = body as { name: string; sort_order: number };

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from('phase_groups')
    .insert({ name, sort_order })
    .select('id, name, sort_order')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, phases: [] }, { status: 201 });
}
