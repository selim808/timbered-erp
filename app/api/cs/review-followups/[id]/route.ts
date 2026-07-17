import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH body: { outcome, rating?, note? } — records the follow-up contact result.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { outcome, rating, note } = await req.json() as {
    outcome: string; rating?: number; note?: string;
  };
  if (!outcome) return NextResponse.json({ error: 'outcome required' }, { status: 400 });

  const db = createAdminClient();
  const updates: Record<string, unknown> = {
    outcome,
    contacted_at: new Date().toISOString(),
  };
  if (rating !== undefined) updates.rating = rating;
  if (note !== undefined) updates.note = note;

  const { data, error } = await db
    .from('cs_review_followups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
