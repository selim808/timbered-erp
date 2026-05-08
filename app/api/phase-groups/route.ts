import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('phase_groups')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { id, label, color, sort_order } = body as {
    id: string; label: string; color: string; sort_order: number;
  };

  if (!id || !label) return NextResponse.json({ error: 'id and label required' }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from('phase_groups')
    .insert({ id, label, color, sort_order, phases: [] })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
