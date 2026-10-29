import type { KanbanData } from '@/lib/phases/kanban';
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
  /** Shopify cancellation time. Woo has no such field, so it falls back to date_modified. */
  date_cancelled: string | null;
  /** Why the order was cancelled. Shopify only — Woo records no reason. */
  cancel_reason: string | null;
  total: string;
  payment_method: string;
  customer_note: string;
  email: string;
  shipping_method: string;
  shipping_total: string;
  discount_total: string;
  /** Woo fee lines. Shopify has no equivalent, so it's always empty there. */
  fee_lines: { name: string; total: string }[];
  billing: CommerceAddress;
  line_items: CommerceLineItem[];
  /** Per-item kanban phase, from the Shopify order metafield timbered.kanban_phase. Null for Woo. */
  kanban?: KanbanData | null;
  /** Version token of that metafield, for conflict-safe writes. */
  kanban_digest?: string | null;
  /** Readable copy of kanban, shown on the Shopify order page (timbered.kanban_status). */
  kanban_summary?: string | null;
  /** Readable phase history, shown on the Shopify order page (timbered.kanban_timeline). */
  kanban_history?: string | null;
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
