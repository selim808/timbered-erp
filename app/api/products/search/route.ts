import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';

function extractMaterial(p: any): string {
  // Try attributes first (e.g. { name: "Material", options: ["Oak"] })
  const attr = (p.attributes ?? []).find((a: any) => /material/i.test(a.name));
  if (attr?.options?.[0]) return attr.options[0];
  // Fallback: meta_data
  const meta = (p.meta_data ?? []).find((m: any) => /material/i.test(m.key));
  if (meta?.value) return String(meta.value);
  return '';
}

async function fetchAllProducts(): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const { data } = await wc.get('/products', {
      params: { status: 'publish', per_page: 100, page, orderby: 'title', order: 'asc' },
    });
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';

  try {
    // When query is present, use WC server-side search as a first pass, then add material.
    // When empty, load all products so the client can display and filter them.
    let raw: any[];
    if (q.trim()) {
      const { data } = await wc.get('/products', {
        params: { search: q, per_page: 100, status: 'publish' },
      });
      raw = data;
    } else {
      raw = await fetchAllProducts();
    }

    const results = raw.map(p => ({
      id: p.id,
      name: p.name,
      image: p.images?.[0]?.src ?? '',
      material: extractMaterial(p),
      price: parseFloat(p.price ?? p.regular_price ?? '0') || 0,
    }));

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
