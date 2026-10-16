import type { CommerceOrder } from '@/lib/commerce/types';

/** What the guarantee certificate needs from one order. */
export interface WarrantyOrder {
  orderNumber: string;
  status: string;
  customerName: string;
  dateCreated: string;
  lineItems: { id: number; name: string; quantity: number }[];
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
