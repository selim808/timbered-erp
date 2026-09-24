import type { PipelineOrder } from '@/app/api/pipeline/orders/route';

// localStorage cache for the After-Sales feeds (completed orders behind the
// Follow-up tab, cancelled orders behind the Cancelled tab). Closed orders
// barely change and the storefront fetch is slow, so we serve the last cached
// copy instantly and only refresh in the background once it's older than 5
// hours. The refresh button forces a live fetch regardless.

export type OrdersFeed = 'completed' | 'cancelled';

export interface OrdersFeedResponse {
  orders: PipelineOrder[];
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
}

const TTL_MS = 5 * 60 * 60 * 1000; // 5 hours
// Bump a feed's version whenever its shape or ordering changes, so existing
// browsers drop their cached copy instead of serving it for up to 5 hours.
// Versioned per feed so one feed's change doesn't throw away the other's cache.
const FEED_VERSION: Record<OrdersFeed, string> = { completed: 'v4', cancelled: 'v5' };
const keyFor = (feed: OrdersFeed, page: number) =>
  `tg_${feed}_orders_p${page}_${FEED_VERSION[feed]}`;

interface Cached {
  ts: number;
  data: OrdersFeedResponse;
}

export function readFeedCache(
  feed: OrdersFeed,
  page: number,
): { data: OrdersFeedResponse; stale: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(keyFor(feed, page));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.data || !Array.isArray(parsed.data.orders)) return null;
    return { data: parsed.data, stale: Date.now() - parsed.ts >= TTL_MS };
  } catch {
    return null;
  }
}

export function writeFeedCache(feed: OrdersFeed, page: number, data: OrdersFeedResponse) {
  try {
    window.localStorage.setItem(keyFor(feed, page), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* quota / private mode — cache is best-effort */
  }
}

export async function fetchFeedOrders(feed: OrdersFeed, page: number): Promise<OrdersFeedResponse> {
  const r = await fetch(`/api/wc/${feed}-orders?page=${page}`);
  const d = await r.json();
  if (d?.error) throw new Error(d.error);
  return d as OrdersFeedResponse;
}
