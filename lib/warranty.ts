import type { CommerceOrder } from '@/lib/commerce/types';

export const GUARANTEE_YEARS = 3;
/** Extra cover on top of the guarantee, since it starts at order date, not delivery. */
export const FULFILMENT_TOLERANCE_MONTHS = 3;

/** What the guarantee certificate needs from one order. */
export interface WarrantyOrder {
  orderNumber: string;
  status: string;
  customerName: string;
  dateCreated: string;
  lineItems: { id: number; name: string; quantity: number }[];
}

/** One printable certificate. Fields are plain text so the owner can edit them. */
export interface Cert {
  orderNumber: string;
  status: string;
  customer: string;
  product: string;
  qty: string;
  startDate: string;
}

export function toWarrantyOrder(order: CommerceOrder): WarrantyOrder {
  const b = order.billing;
  return {
    orderNumber:  String(order.number || order.id),
    status:       order.status,
    customerName: [b.first_name, b.last_name].filter(Boolean).join(' '),
    dateCreated:  order.date_created,
    lineItems:    order.line_items.map(li => ({
      id:       li.id,
      name:     li.name,
      quantity: li.quantity,
    })),
  };
}

/** ISO timestamp → yyyy-mm-dd in Cairo time. */
export function toYmd(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

export function certFromOrder(o: WarrantyOrder): Cert {
  return {
    orderNumber: o.orderNumber,
    status:      o.status,
    customer:    o.customerName,
    product:     o.lineItems.map(li => li.name).join('\n'),
    qty:         o.lineItems.map(li => li.quantity).join('\n'),
    startDate:   toYmd(o.dateCreated),
  };
}

/** yyyy-mm-dd → 03-Sep-2026 (matches the Word template). */
export function fmtCertDate(ymd: string) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const mon = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${String(d).padStart(2, '0')}-${mon}-${y}`;
}

function addMonths(ymd: string, months: number) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  // 31-May + 1 month would roll into July; clamp to the last day of the target month.
  if (dt.getUTCDate() !== d) dt.setUTCDate(0);
  return dt.toISOString().slice(0, 10);
}

export function validUntil(startDate: string) {
  return addMonths(startDate, GUARANTEE_YEARS * 12 + FULFILMENT_TOLERANCE_MONTHS);
}
