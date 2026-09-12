import { NextResponse } from 'next/server';
import { fetchOrderById } from '@/lib/commerce/orders';
import { EG_STATES } from '@/lib/commerce/map';
import type { CommerceSource } from '@/lib/commerce/types';

export interface OrderDetail {
  id: number;
  number: string;
  source: CommerceSource;
  status: string;
  dateCreated: string;
  dateCompleted: string | null;
  customer: { name: string; email: string; phone: string; address: string };
  items: { name: string; quantity: number; price: number; total: number }[];
  shippingMethod: string;
  shippingTotal: number;
  discountTotal: number;
  fees: { name: string; total: number }[];
  total: number;
  paymentMethod: string;
  customerNote: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const o = await fetchOrderById(id);
    if (!o) return NextResponse.json({ error: `Order ${id} not found` }, { status: 404 });

    const b = o.billing;
    const detail: OrderDetail = {
      id: o.id,
      number: o.number,
      source: o.source,
      status: o.status,
      dateCreated:   o.date_created?.slice(0, 10)   ?? '',
      dateCompleted: o.date_completed?.slice(0, 10) ?? null,
      customer: {
        name:    `${b.first_name} ${b.last_name}`.trim(),
        email:   o.email,
        phone:   b.phone,
        address: [b.address_1, b.address_2, b.city, EG_STATES[b.state] ?? b.state]
          .filter(Boolean).join(', '),
      },
      items: o.line_items.map(i => ({
        name:     i.name,
        quantity: i.quantity,
        price:    i.price,
        total:    parseFloat(i.total) || 0,
      })),
      shippingMethod: o.shipping_method,
      shippingTotal:  parseFloat(o.shipping_total) || 0,
      discountTotal:  parseFloat(o.discount_total) || 0,
      fees: o.fee_lines.map(f => ({ name: f.name, total: parseFloat(f.total) || 0 })),
      total:         parseFloat(o.total) || 0,
      paymentMethod: o.payment_method,
      customerNote:  o.customer_note,
    };

    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
