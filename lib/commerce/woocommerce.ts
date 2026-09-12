import wc from '@/lib/woocommerce/client';
import type { CommerceLineItem, CommerceOrder, CommerceStatus, OrderQuery } from './types';

interface RawWcLineItem {
  id: number; name: string; product_id: number; quantity: number;
  price: number; total: string; sku: string; image: { src: string } | null;
}
interface RawWcOrder {
  id: number; number: string; status: string;
  date_created: string; date_modified: string; date_completed: string | null;
  total: string; payment_method_title?: string; customer_note?: string;
  billing?: {
    first_name?: string; last_name?: string; address_1?: string;
    address_2?: string; city?: string; state?: string; phone?: string;
  };
  line_items?: RawWcLineItem[];
}

const KNOWN: CommerceStatus[] = ['processing', 'completed', 'cancelled', 'on-hold', 'pending'];

function mapStatus(status: string): CommerceStatus {
  return (KNOWN as string[]).includes(status) ? status as CommerceStatus : 'pending';
}

function normalize(o: RawWcOrder): CommerceOrder {
  return {
    source: 'wc',
    gid: null,
    id: o.id,
    number: String(o.number ?? o.id),
    status: mapStatus(o.status),
    date_created: o.date_created,
    date_modified: o.date_modified,
    date_completed: o.date_completed,
    total: o.total ?? '0',
    payment_method: o.payment_method_title ?? '',
    customer_note: o.customer_note ?? '',
    billing: {
      first_name: o.billing?.first_name ?? '',
      last_name: o.billing?.last_name ?? '',
      address_1: o.billing?.address_1 ?? '',
      address_2: o.billing?.address_2 ?? '',
      city: o.billing?.city ?? '',
      state: o.billing?.state ?? '',
      phone: o.billing?.phone ?? '',
    },
    line_items: (o.line_items ?? []).map((li): CommerceLineItem => ({
      id: li.id,
      name: li.name,
      product_id: li.product_id,
      quantity: li.quantity,
      price: Number(li.price ?? 0),
      total: li.total ?? '0',
      sku: li.sku ?? '',
      image: li.image?.src ? { src: li.image.src } : null,
    })),
  };
}

const LITE_FIELDS = 'id,number,status,total,date_created,date_modified,date_completed';

export async function fetchWcOrderById(id: string): Promise<CommerceOrder | null> {
  try {
    const { data } = await wc.get(`/orders/${id}`);
    return data ? normalize(data) : null;
  } catch {
    return null;
  }
}

export async function fetchWcOrders(
  { status, after, before, modifiedAfter, modifiedBefore, lite }: OrderQuery = {},
): Promise<CommerceOrder[]> {
  const params: Record<string, string | number> = { per_page: 100, status: status ?? 'any' };
  if (after) params.after = after;
  if (before) params.before = before;
  if (modifiedAfter) params.modified_after = modifiedAfter;
  if (modifiedBefore) params.modified_before = modifiedBefore;
  if (lite) params._fields = LITE_FIELDS;

  const all: RawWcOrder[] = [];
  let page = 1;
  for (;;) {
    const { data } = await wc.get('/orders', { params: { ...params, page } });
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all.map(normalize);
}
