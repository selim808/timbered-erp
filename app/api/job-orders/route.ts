import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('jo_plans')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json() as { ref: string; items: unknown[] };
  if (!body.ref || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'ref and items required' }, { status: 400 });
  }
  const db = createAdminClient();
  const { data, error } = await db
    .from('jo_plans')
    .insert({ ref: body.ref, items: body.items, status: 'open' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
