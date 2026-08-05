import type { CompletedOrdersResponse } from '@/app/api/wc/completed-orders/route';

// localStorage cache for the After-Sales → Follow-up (completed orders) feed.
// Completed orders barely change, and the WooCommerce fetch is slow, so we serve
// the last cached copy instantly and only refresh in the background once it's
// older than 5 hours. The refresh button forces a live fetch regardless.

const TTL_MS = 5 * 60 * 60 * 1000; // 5 hours
const keyFor = (page: number) => `tg_completed_orders_p${page}_v1`;

interface Cached {
  ts: number;
  data: CompletedOrdersResponse;
}

export function readCompletedCache(
  page: number,
): { data: CompletedOrdersResponse; stale: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(keyFor(page));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.data || !Array.isArray(parsed.data.orders)) return null;
    return { data: parsed.data, stale: Date.now() - parsed.ts >= TTL_MS };
  } catch {
    return null;
  }
}

export function writeCompletedCache(page: number, data: CompletedOrdersResponse) {
  try {
    window.localStorage.setItem(keyFor(page), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* quota / private mode — cache is best-effort */
  }
}

export async function fetchCompletedOrders(page: number): Promise<CompletedOrdersResponse> {
  const r = await fetch(`/api/wc/completed-orders?page=${page}`);
  const d = await r.json();
  if (d?.error) throw new Error(d.error);
  return d as CompletedOrdersResponse;
}
