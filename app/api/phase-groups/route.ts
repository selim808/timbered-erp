import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('phase_groups')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
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
