export type CommerceSource = 'wc' | 'shopify';

/** Lifecycle status, normalized across both platforms. */
export type CommerceStatus = 'processing' | 'completed' | 'cancelled' | 'on-hold' | 'pending';

export interface CommerceLineItem {
  id: number;
  name: string;
  product_id: number;
  quantity: number;
  price: number;
  total: string;
  sku: string;
  image: { src: string } | null;
}

export interface CommerceAddress {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  phone: string;
}

/**
 * Mirrors the WooCommerce REST order shape. Shopify orders are normalized into
 * it so the reporting and pipeline routes read one shape from both platforms.
 */
export interface CommerceOrder {
  source: CommerceSource;
  /** Shopify global id, needed to write back (archive/cancel). Null for Woo. */
  gid: string | null;
  id: number;
  number: string;
  status: CommerceStatus;
  date_created: string;
  date_modified: string;
  date_completed: string | null;
  total: string;
  payment_method: string;
  customer_note: string;
  billing: CommerceAddress;
  line_items: CommerceLineItem[];
}

export interface OrderQuery {
  /** Omit for every status. */
  status?: CommerceStatus;
  /** Inclusive ISO date-time lower bound on creation. */
  after?: string;
  /** Inclusive ISO date-time upper bound on creation. */
  before?: string;
  /** Inclusive ISO bounds on last modification, for "what changed this week" views. */
  modifiedAfter?: string;
  modifiedBefore?: string;
  /** Skip line items. Aggregate reports only need totals and dates. */
  lite?: boolean;
}
