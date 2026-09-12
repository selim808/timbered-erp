const SHOP = process.env.SHOPIFY_SHOP;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2026-07';

interface CachedToken { value: string; expiresAt: number }
let cached: CachedToken | null = null;

async function getToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 300_000) return cached.value;

  const res = await fetch(`https://${SHOP}.myshopify.com/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SHOPIFY_CLIENT_ID ?? '',
      client_secret: process.env.SHOPIFY_CLIENT_SECRET ?? '',
    }),
  });

  if (!res.ok) {
    throw new Error(`Shopify token request failed (${res.status}): ${await res.text()}`);
  }

  const body = await res.json() as { access_token: string; expires_in: number };
  cached = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cached.value;
}

/** Admin GraphQL call. Retries on Shopify's THROTTLED error with linear backoff. */
export async function shopifyGql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const url = `https://${SHOP}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': await getToken(),
      },
      body: JSON.stringify({ query, variables }),
    });

    // A rotated or rescoped app invalidates the cached grant; drop it and retry once.
    if (res.status === 401 || res.status === 403) {
      cached = null;
      if (attempt === 0) continue;
      throw new Error(`Shopify auth failed (${res.status}): ${await res.text()}`);
    }
    if (!res.ok) throw new Error(`Shopify HTTP ${res.status}: ${await res.text()}`);

    const body = await res.json() as {
      data?: T;
      errors?: { message: string; extensions?: { code?: string } }[];
    };

    if (body.errors?.length) {
      if (body.errors.some(e => e.extensions?.code === 'THROTTLED')) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw new Error(`Shopify GraphQL: ${JSON.stringify(body.errors)}`);
    }
    return body.data as T;
  }
  throw new Error('Shopify throttled after 5 attempts');
}
