import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { seedNewShopifyOrder } from '@/lib/phases/kanban';

// Shopify "orders/create" webhook (registered in the fetchData app).
// Gives every item of a new order the first kanban phase straight away.
// Shopify signs each call with the app's client secret; unsigned calls are rejected.

export const runtime = 'nodejs';

function verified(rawBody: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  const given = Buffer.from(hmacHeader, 'base64');
  return given.length === digest.length && timingSafeEqual(given, digest);
}

interface OrderPayload {
  admin_graphql_api_id?: string;
  created_at?: string;
  line_items?: { id: number; title?: string; name?: string }[];
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verified(raw, req.headers.get('x-shopify-hmac-sha256'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let order: OrderPayload;
  try {
    order = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }
  if (!order.admin_graphql_api_id) return NextResponse.json({ ok: true, skipped: 'no order id' });

  try {
    const result = await seedNewShopifyOrder(
      order.admin_graphql_api_id,
      (order.line_items ?? []).map(li => ({ id: li.id, title: li.title ?? li.name ?? '' })),
      order.created_at ?? '',
    );
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    // A non-2xx makes Shopify retry later, which is what we want on a temporary failure.
    console.error('orders/create seed failed:', (e as Error).message);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
