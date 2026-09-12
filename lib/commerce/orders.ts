import { fetchWcOrders, fetchWcOrderById } from './woocommerce';
import { fetchShopifyOrders, fetchShopifyOrderByName } from '@/lib/shopify/orders';
import type { CommerceOrder, CommerceSource, OrderQuery } from './types';

export type { CommerceOrder, CommerceSource, CommerceStatus, OrderQuery } from './types';

/**
 * Which storefronts the ERP reads. Set COMMERCE_SOURCES=shopify once the last
 * WooCommerce order is closed to retire Woo without a code change.
 */
export function enabledSources(): CommerceSource[] {
  const raw = (process.env.COMMERCE_SOURCES ?? 'wc,shopify')
    .split(',')
    .map(s => s.trim())
    .filter((s): s is CommerceSource => s === 'wc' || s === 'shopify');
  return raw.length ? raw : ['shopify'];
}

/** One order by its storefront-facing number, whichever platform owns it. */
export async function fetchOrderById(id: string): Promise<CommerceOrder | null> {
  const sources = enabledSources();

  if (sources.includes('shopify')) {
    const order = await fetchShopifyOrderByName(id);
    if (order) return order;
  }
  return sources.includes('wc') ? fetchWcOrderById(id) : null;
}

/** Orders from every enabled storefront, newest first. */
export async function fetchOrders(query: OrderQuery = {}): Promise<CommerceOrder[]> {
  const sources = enabledSources();

  const batches = await Promise.all([
    sources.includes('wc') ? fetchWcOrders(query) : Promise.resolve([]),
    sources.includes('shopify') ? fetchShopifyOrders(query) : Promise.resolve([]),
  ]);

  return batches
    .flat()
    .sort((a, b) => b.date_created.localeCompare(a.date_created));
}
