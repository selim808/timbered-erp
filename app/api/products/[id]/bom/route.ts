import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data } = await wc.get(`/products/${id}`);
    const bomMeta = (data.meta_data ?? []).find((m: any) =>
      /^(bom|_bom|product_bom|bom_data)$/i.test(m.key)
    );
    let bom: unknown[] = [];
    if (bomMeta?.value) {
      try {
        bom = typeof bomMeta.value === 'string'
          ? JSON.parse(bomMeta.value)
          : bomMeta.value;
      } catch { bom = []; }
    }
    return NextResponse.json(Array.isArray(bom) ? bom : []);
  } catch {
    return NextResponse.json([]);
  }
}
