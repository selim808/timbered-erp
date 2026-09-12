import { shopifyGql } from './client';
import type { CommerceLineItem, CommerceOrder, CommerceStatus, OrderQuery } from '@/lib/commerce/types';

// Page size is bounded by the 1000-point query cost ceiling, which line items
// dominate; without them a page can be far larger.
const ORDERS_PAGE = 15;
const ORDERS_PAGE_LITE = 100;
const LINE_ITEMS = 50;

const LINE_ITEMS_FRAGMENT = `
      lineItems(first: $li) {
        nodes {
          id title quantity sku
          variant { id }
          product {
            id
            featuredImage { url }
            metafield(namespace: "timbered", key: "product_id") { value }
          }
          image { url }
          discountedUnitPriceSet { shopMoney { amount } }
          originalUnitPriceSet { shopMoney { amount } }
        }
      }`;

function ordersQuery(lite: boolean): string {
  // $li must not be declared when the line-items selection is omitted —
  // Shopify rejects a query that declares a variable it never uses.
  return `
query Orders($first: Int!, ${lite ? '' : '$li: Int!, '}$cursor: String, $q: String) {
  orders(first: $first, after: $cursor, query: $q, sortKey: CREATED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id name createdAt updatedAt cancelledAt closed closedAt note email phone
      paymentGatewayNames
      currentTotalPriceSet { shopMoney { amount } }
      customer { firstName lastName phone }
      billingAddress { firstName lastName phone }
      shippingAddress { firstName lastName name phone address1 address2 city province }${lite ? '' : LINE_ITEMS_FRAGMENT}
    }
  }
}`;
}

interface RawMoney { shopMoney: { amount: string } }
interface RawLineItem {
  id: string;
  title: string;
  quantity: number;
  sku: string | null;
  variant: { id: string } | null;
  product: {
    id: string;
    featuredImage: { url: string } | null;
    metafield: { value: string } | null;
  } | null;
  image: { url: string } | null;
  discountedUnitPriceSet: RawMoney | null;
  originalUnitPriceSet: RawMoney | null;
}
interface RawAddress {
  firstName?: string | null; lastName?: string | null; name?: string | null;
  phone?: string | null; address1?: string | null; address2?: string | null;
  city?: string | null; province?: string | null;
}
interface RawOrder {
  id: string; name: string; createdAt: string; updatedAt: string;
  cancelledAt: string | null; closed: boolean; closedAt: string | null;
  note: string | null; email: string | null; phone: string | null;
  paymentGatewayNames: string[];
  currentTotalPriceSet: RawMoney;
  customer: { firstName: string | null; lastName: string | null; phone: string | null } | null;
  billingAddress: RawAddress | null;
  shippingAddress: RawAddress | null;
  lineItems?: { nodes: RawLineItem[] };
}

/** Trailing digits of a Shopify gid, e.g. gid://shopify/Product/123 -> 123. */
function gidNumber(gid: string | null | undefined): number {
  if (!gid) return 0;
  return Number(gid.split('/').pop()) || 0;
}

function statusFilter(status: CommerceStatus | undefined): string | null {
  switch (status) {
    // "closed" is Shopify's archive flag — archiving is the Woo "completed" equivalent.
    case 'completed':  return 'status:closed';
    case 'processing': return 'status:open';
    case 'cancelled':  return 'status:cancelled';
    case 'on-hold':
    case 'pending':    return 'financial_status:pending';
    default:           return null;
  }
}

function buildQuery({ status, after, before, modifiedAfter, modifiedBefore }: OrderQuery): string | null {
  const parts: string[] = [];
  const st = statusFilter(status);
  if (st) parts.push(st);
  if (after) parts.push(`created_at:>='${new Date(after).toISOString()}'`);
  if (before) parts.push(`created_at:<='${new Date(before).toISOString()}'`);
  if (modifiedAfter) parts.push(`updated_at:>='${new Date(modifiedAfter).toISOString()}'`);
  if (modifiedBefore) parts.push(`updated_at:<='${new Date(modifiedBefore).toISOString()}'`);
  return parts.length ? parts.join(' AND ') : null;
}

function fullName(o: RawOrder): string {
  const join = (a?: string | null, b?: string | null) => [a, b].filter(Boolean).join(' ').trim();
  const name =
    join(o.customer?.firstName, o.customer?.lastName) ||
    join(o.billingAddress?.firstName, o.billingAddress?.lastName) ||
    join(o.shippingAddress?.firstName, o.shippingAddress?.lastName) ||
    (o.shippingAddress?.name ?? '').trim();
  // Orders imported without customer records come back nameless; the email's
  // local part at least keeps the column usable.
  if (name) return name;
  return o.email ? String(o.email).split('@')[0].split('+')[0] : '';
}

function mapLineItem(li: RawLineItem, idx: number): CommerceLineItem {
  const price = Number((li.discountedUnitPriceSet ?? li.originalUnitPriceSet)?.shopMoney.amount ?? 0);

  // Migrated products keep their WooCommerce id in a metafield. Preferring it
  // keeps stockcount, BOM and item_phase — all keyed on Woo product ids —
  // working for Shopify orders without a data migration.
  const wooId = Number(li.product?.metafield?.value) || 0;

  return {
    // Stable per line item, so item_phase rows survive edits to the order.
    id: gidNumber(li.id) || idx + 1,
    name: li.title,
    product_id: wooId || gidNumber(li.product?.id),
    quantity: li.quantity,
    price,
    total: String(price * li.quantity),
    sku: li.sku ?? '',
    image: li.image?.url
      ? { src: li.image.url }
      : li.product?.featuredImage?.url
        ? { src: li.product.featuredImage.url }
        : null,
  };
}

function normalize(o: RawOrder): CommerceOrder {
  const ship = o.shippingAddress ?? {};
  const name = fullName(o);
  const [first, ...rest] = name.split(' ');

  return {
    source: 'shopify',
    gid: o.id,
    id: Number(String(o.name).replace('#', '')) || 0,
    number: String(o.name).replace('#', ''),
    status: o.cancelledAt ? 'cancelled' : o.closed ? 'completed' : 'processing',
    date_created: o.createdAt,
    date_modified: o.updatedAt,
    date_completed: o.closedAt,
    total: String(o.currentTotalPriceSet.shopMoney.amount),
    payment_method: (o.paymentGatewayNames ?? []).join(', '),
    customer_note: o.note ?? '',
    billing: {
      first_name: first ?? '',
      last_name: rest.join(' '),
      address_1: ship.address1 ?? '',
      address_2: ship.address2 ?? '',
      city: ship.city ?? '',
      // Shopify returns province names ("Cairo"), not Woo's numeric codes.
      state: ship.province ?? '',
      phone: o.billingAddress?.phone ?? o.customer?.phone ?? ship.phone ?? o.phone ?? '',
    },
    line_items: (o.lineItems?.nodes ?? []).map(mapLineItem),
  };
}

export async function fetchShopifyOrderByName(name: string): Promise<CommerceOrder | null> {
  const data = await shopifyGql<{ orders: { nodes: RawOrder[] } }>(
    ordersQuery(false),
    { first: 1, li: LINE_ITEMS, cursor: null, q: `name:${String(name).replace('#', '')}` },
  );
  const node = data.orders.nodes[0];
  return node ? normalize(node) : null;
}

export async function fetchShopifyOrders(query: OrderQuery = {}): Promise<CommerceOrder[]> {
  const q = buildQuery(query);
  const lite = query.lite === true;
  const gql = ordersQuery(lite);
  const first = lite ? ORDERS_PAGE_LITE : ORDERS_PAGE;
  const out: CommerceOrder[] = [];
  let cursor: string | null = null;

  for (;;) {
    const data: { orders: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: RawOrder[] } } =
      await shopifyGql(gql, { first, cursor, q, ...(lite ? {} : { li: LINE_ITEMS }) });

    out.push(...data.orders.nodes.map(normalize));
    if (!data.orders.pageInfo.hasNextPage) break;
    cursor = data.orders.pageInfo.endCursor;
  }
  return out;
}
