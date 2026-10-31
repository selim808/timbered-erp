import { NextResponse } from 'next/server';
import { shopifyGql } from '@/lib/shopify/client';

// GET: make sure fetchData has its orders/create webhook pointing at this ERP.
// Safe to call any number of times: it only ever creates that one subscription,
// to this ERP's own fixed address, and does nothing if it already exists.

const TOPIC = 'ORDERS_CREATE';
const URI = 'https://timbered-erp.vercel.app/api/webhooks/shopify/orders-create';

export async function GET() {
  try {
    const existing = await shopifyGql<{ webhookSubscriptions: { nodes: { id: string; uri: string }[] } }>(
      `query($topics: [WebhookSubscriptionTopic!], $uri: String) {
         webhookSubscriptions(first: 10, topics: $topics, uri: $uri) { nodes { id uri } }
       }`,
      { topics: [TOPIC], uri: URI },
    );
    if (existing.webhookSubscriptions.nodes.length) {
      return NextResponse.json({ ok: true, status: 'already registered' });
    }

    const res = await shopifyGql<{
      webhookSubscriptionCreate: { webhookSubscription: { id: string } | null; userErrors: { message: string }[] };
    }>(
      `mutation($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
         webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
           webhookSubscription { id }
           userErrors { message }
         }
       }`,
      { topic: TOPIC, sub: { uri: URI, format: 'JSON' } },
    );
    const errs = res.webhookSubscriptionCreate.userErrors;
    if (errs.length) return NextResponse.json({ ok: false, error: errs.map(e => e.message).join('; ') }, { status: 500 });
    return NextResponse.json({ ok: true, status: 'registered' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
