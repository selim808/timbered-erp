import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);

  if (!q.trim()) return NextResponse.json([]);

  try {
    const { data } = await wc.get('/products', {
      params: { search: q, per_page: limit, status: 'publish' },
    });
    const results = (data as any[]).map(p => ({
      id: p.id,
      name: p.name,
      image: p.images?.[0]?.src ?? '',
    }));
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
