// Product stock from the warehouse app's Neon database ("stock" database,
// table stock_items: one row per product with its current balance).
//
// Connection: STOCK_DATABASE_URL (a read-only Postgres connection string to the
// "stock" database). Without it every product reads as 0 in stock.
import { neon } from '@neondatabase/serverless';

const CACHE_MS = 60_000;

export interface StockItem {
  shopifyProductId: string;
  name: string;
  balance: number;
}

interface StockIndex {
  byShopifyId: Map<string, number>;
  byName: Map<string, number>;
  items: StockItem[];
}

let cache: { at: number; index: StockIndex } | null = null;

const nameKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const EMPTY: StockIndex = { byShopifyId: new Map(), byName: new Map(), items: [] };

/** Every product's balance, re-read at most once a minute. Empty (not an error) when unreachable. */
export async function getStockIndex(): Promise<StockIndex> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.index;
  const url = process.env.STOCK_DATABASE_URL;
  if (!url) return EMPTY;
  try {
    const sql = neon(url);
    const rows = await sql`select shopify_product_id, name, balance from stock_items` as
      { shopify_product_id: string | null; name: string | null; balance: string | number | null }[];
    const index: StockIndex = { byShopifyId: new Map(), byName: new Map(), items: [] };
    for (const r of rows) {
      const balance = Number(r.balance) || 0;
      const item = { shopifyProductId: r.shopify_product_id ?? '', name: r.name ?? '', balance };
      index.items.push(item);
      if (item.shopifyProductId) index.byShopifyId.set(item.shopifyProductId, balance);
      if (item.name) index.byName.set(nameKey(item.name), balance);
    }
    cache = { at: Date.now(), index };
    return index;
  } catch (e) {
    console.error('[stock] could not read stock_items:', e);
    return cache?.index ?? EMPTY;
  }
}

/** A line item's product stock: by Shopify product id, else by product name. */
export function stockOf(
  index: StockIndex,
  li: { shopify_product_id?: number; product_id?: number; name?: string },
): number {
  for (const id of [li.shopify_product_id, li.product_id]) {
    if (id) {
      const v = index.byShopifyId.get(String(id));
      if (v !== undefined) return v;
    }
  }
  return li.name ? index.byName.get(nameKey(li.name)) ?? 0 : 0;
}
