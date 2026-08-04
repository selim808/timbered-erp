import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_HTML_BYTES = 5 * 1024 * 1024;

const FULL_COLUMNS = 'id, title, slug, html, source_filename, sort_order, created_at, updated_at';

// GET: one page including its stored HTML body.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createAdminClient();
  const { data, error } = await db
    .from('extra_pages')
    .select(FULL_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH: rename a page or replace its HTML. Body: { title?, html?, source_filename? }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { title?: string; html?: string; source_filename?: string | null };

  const patch: Record<string, string | null> = {};

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
    patch.title = title;
  }

  if (body.html !== undefined) {
    if (!body.html.trim()) return NextResponse.json({ error: 'html cannot be empty' }, { status: 400 });
    if (Buffer.byteLength(body.html, 'utf8') > MAX_HTML_BYTES) {
      return NextResponse.json({ error: 'HTML is larger than 5 MB' }, { status: 413 });
    }
    patch.html = body.html;
  }

  if (body.source_filename !== undefined) {
    patch.source_filename = body.source_filename?.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('extra_pages')
    .update(patch)
    .eq('id', id)
    .select('id, title, slug, source_filename, sort_order, created_at, updated_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE: remove a page and its stored HTML.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createAdminClient();
  const { error } = await db.from('extra_pages').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
