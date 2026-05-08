import { NextResponse } from 'next/server';
import wc from '@/lib/woocommerce/client';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await wc.put(`/orders/${id}`, { status: 'completed' });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
