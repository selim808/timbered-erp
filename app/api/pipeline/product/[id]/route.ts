import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { data } = await wc.get(`/products/${id}`);
    const d = data.dimensions ?? {};
    const dim = [d.length, d.width, d.height].filter(Boolean).join(' × ');
    const material = (data.attributes ?? [])
      .find((a: any) => /material|wood|fabric/i.test(a.name))
      ?.options?.join(', ') ?? '';
    const imageUrl: string = data.images?.[0]?.src ?? '';
    return NextResponse.json({ dim, material, imageUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
