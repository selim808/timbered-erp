import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const phase = new URL(req.url).searchParams.get('phase');
  if (!phase) return NextResponse.json({ error: 'phase param required' }, { status: 400 });

  const db = createAdminClient();
  const { data, error } = await db
    .from('item_phase')
    .select('id, order_id, line_item_id')
    .eq('phase', phase);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
