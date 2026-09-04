import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { accessToken, cookieName, getExtraPage, readExtraHtml } from '@/lib/extras';

// Serves the raw HTML document (its own <html>/<script>) rather than embedding
// it in a React tree, so the page's own scripts run. The file is never exposed
// as a static asset — this handler is the only way to it.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const page = await getExtraPage(slug);
  if (!page) return new Response('Not found', { status: 404 });

  const jar = await cookies();
  if (jar.get(cookieName(slug))?.value !== accessToken(page)) {
    redirect(`/extras/${slug}/unlock`);
  }

  return new Response(await readExtraHtml(page.file_name), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
