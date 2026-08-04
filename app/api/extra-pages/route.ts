import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Uploaded documents are stored verbatim, so cap them to keep a stray binary
// or a monster export from bloating a row.
const MAX_HTML_BYTES = 5 * 1024 * 1024;

const LIST_COLUMNS = 'id, title, slug, source_filename, sort_order, created_at, updated_at';

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/\.html?$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'page';
}

// GET: list pages (metadata only — html bodies stay out of the list payload).
export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('extra_pages')
    .select(LIST_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST: add a page. Body: { title, html, source_filename? }
export async function POST(req: Request) {
  const body = await req.json() as { title?: string; html?: string; source_filename?: string };
  const title = (body.title ?? '').trim();
  const html = body.html ?? '';
  const sourceFilename = (body.source_filename ?? '').trim() || null;

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  if (!html.trim()) return NextResponse.json({ error: 'html required' }, { status: 400 });
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return NextResponse.json({ error: 'HTML is larger than 5 MB' }, { status: 413 });
  }

  const db = createAdminClient();

  const { data: last } = await db
    .from('extra_pages')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  const sort_order = (last?.[0]?.sort_order ?? 0) + 10;

  // Slugs are unique; retry with a numeric suffix when the nice one is taken.
  const base = slugify(title);
  for (let attempt = 0; attempt < 25; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await db
      .from('extra_pages')
      .insert({ title, slug, html, source_filename: sourceFilename, sort_order })
      .select(LIST_COLUMNS)
      .single();

    if (!error) return NextResponse.json(data, { status: 201 });
    if (error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'could not allocate a unique slug' }, { status: 409 });
}
