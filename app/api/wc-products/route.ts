import { NextResponse } from 'next/server';

export async function GET() {
  const KEY    = process.env.WC_CONSUMER_KEY!;
  const SECRET = process.env.WC_CONSUMER_SECRET!;
  const BASE   = process.env.WC_BASE_URL!;

  const url = (page: number) =>
    `${BASE}/products?consumer_key=${KEY}&consumer_secret=${SECRET}&per_page=100&orderby=title&order=asc&page=${page}`;

  try {
    const first      = await fetch(url(1));
    if (!first.ok) throw new Error(`WC ${first.status}`);
    const totalPages = parseInt(first.headers.get('X-WP-TotalPages') || '1', 10);
    const firstData  = await first.json();

    const rest = totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            fetch(url(i + 2)).then(r => r.json())
          )
        )
      : [];

    const products = ([firstData, ...rest] as any[][]).flat().map((p: any) => ({
      id:     p.id,
      name:   p.name,
      images: p.images?.slice(0, 1) ?? [],
    }));

    return NextResponse.json(products);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
