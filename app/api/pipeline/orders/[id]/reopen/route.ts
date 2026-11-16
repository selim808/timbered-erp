import { NextResponse } from 'next/server';
import { reopenOrder } from '@/lib/commerce/write';

// POST: mark a completed order as not completed (back to processing).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await reopenOrder(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
