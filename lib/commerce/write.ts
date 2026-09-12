import wc from '@/lib/woocommerce/client';
import { shopifyGql } from '@/lib/shopify/client';
import { enabledSources } from './orders';
import type { CommerceSource } from './types';

interface Resolved { source: CommerceSource; gid: string | null }

/**
 * Order numbers don't overlap between the two storefronts, but rather than rely
 * on that, ask Shopify whether it owns the number. The lookup also yields the
 * gid every Shopify mutation needs.
 */
export async function resolveOrder(id: string): Promise<Resolved> {
  if (!enabledSources().includes('shopify')) return { source: 'wc', gid: null };

  const data = await shopifyGql<{ orders: { nodes: { id: string }[] } }>(
    'query($q: String!) { orders(first: 1, query: $q) { nodes { id } } }',
    { q: `name:${String(id).replace('#', '')}` },
  );

  const gid = data.orders.nodes[0]?.id ?? null;
  return gid ? { source: 'shopify', gid } : { source: 'wc', gid: null };
}

function assertNoUserErrors(errors: { message: string }[] | undefined, op: string) {
  if (errors?.length) throw new Error(`Shopify ${op}: ${errors.map(e => e.message).join('; ')}`);
}

/** Woo "completed" maps to a Shopify archive (close). */
export async function completeOrder(id: string): Promise<void> {
  const { source, gid } = await resolveOrder(id);

  if (source === 'wc') {
    await wc.put(`/orders/${id}`, { status: 'completed' });
    return;
  }

  const res = await shopifyGql<{ orderClose: { userErrors: { message: string }[] } }>(
    'mutation($input: OrderCloseInput!) { orderClose(input: $input) { userErrors { message } } }',
    { input: { id: gid } },
  );
  assertNoUserErrors(res.orderClose.userErrors, 'orderClose');
}

/**
 * Move an order back to active. On Woo this also reverts the "__<reason>"
 * last-name suffix and clears the cancellation meta, fully undoing a cancel.
 */
export async function reactivateOrder(id: string): Promise<void> {
  const { source, gid } = await resolveOrder(id);

  if (source === 'wc') {
    const { data: order } = await wc.get(`/orders/${id}`);
    const lastName = String(order?.billing?.last_name ?? '');
    const idx = lastName.indexOf('__');

    await wc.put(`/orders/${id}`, {
      status: 'processing',
      ...(idx === -1 ? {} : { billing: { last_name: lastName.slice(0, idx) } }),
      meta_data: [{ key: 'cancellation_reason', value: '' }],
    });
    return;
  }

  // Shopify can reopen an archived order but has no un-cancel; a cancelled
  // order has to be recreated by hand, so say so rather than failing opaquely.
  const state = await shopifyGql<{ order: { cancelledAt: string | null } | null }>(
    'query($id: ID!) { order(id: $id) { cancelledAt } }',
    { id: gid },
  );
  if (state.order?.cancelledAt) {
    throw new Error(
      `Shopify order ${id} was cancelled and cannot be reactivated — Shopify has no un-cancel. Duplicate it into a new order instead.`,
    );
  }

  const res = await shopifyGql<{ orderOpen: { userErrors: { message: string }[] } }>(
    'mutation($input: OrderOpenInput!) { orderOpen(input: $input) { userErrors { message } } }',
    { input: { id: gid } },
  );
  assertNoUserErrors(res.orderOpen.userErrors, 'orderOpen');
}

export async function cancelOrder(id: string, reason: string): Promise<void> {
  const { source, gid } = await resolveOrder(id);

  if (source === 'wc') {
    const payload: Record<string, unknown> = { status: 'cancelled' };
    if (reason) {
      payload.meta_data = [{ key: 'cancellation_reason', value: reason }];

      // Append "__<reason>" to the customer's last name so the reason is
      // visible alongside the name. Skip if a marker is already present.
      const { data: order } = await wc.get(`/orders/${id}`);
      const lastName = String(order?.billing?.last_name ?? '');
      if (!lastName.includes('__')) {
        payload.billing = { last_name: `${lastName}__${reason}` };
      }
    }
    await wc.put(`/orders/${id}`, payload);
    return;
  }

  const res = await shopifyGql<{ orderCancel: { orderCancelUserErrors: { message: string }[] } }>(
    `mutation($orderId: ID!, $reason: OrderCancelReason!, $staffNote: String) {
       orderCancel(orderId: $orderId, reason: $reason, restock: true,
                   notifyCustomer: false, staffNote: $staffNote) {
         orderCancelUserErrors { message }
       }
     }`,
    { orderId: gid, reason: 'OTHER', staffNote: reason || null },
  );
  assertNoUserErrors(res.orderCancel.orderCancelUserErrors, 'orderCancel');
}
