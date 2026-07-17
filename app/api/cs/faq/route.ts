import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: list active FAQ/script entries, ordered by sort_order.
export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('cs_faq_entries')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: add an entry. Body: { category?, question, answer }
export async function POST(req: Request) {
  const { category, question, answer } = await req.json() as {
    category?: string; question: string; answer: string;
  };
  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: 'question and answer required' }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: existing } = await db
    .from('cs_faq_entries')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const sort_order = (existing?.[0]?.sort_order ?? 0) + 10;

  const { data, error } = await db
    .from('cs_faq_entries')
    .insert({ category: category ?? null, question: question.trim(), answer: answer.trim(), sort_order, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
