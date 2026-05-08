import { NextResponse } from 'next/server';
import wcClient from '@/lib/woocommerce/client';

interface WCLineItem {
  name: string;
  quantity: number;
  price: number;
  total: string;
  subtotal: string;
}

interface WCShippingLine { method_title: string; total: string; }
interface WCFeeLine     { name: string; total: string; }
interface WCCouponLine  { code: string; discount: string; }

interface WCOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  date_completed: string | null;
  billing: {
    first_name: string; last_name: string;
    email: string; phone: string;
    address_1: string; address_2: string; city: string; state: string;
  };
  line_items:    WCLineItem[];
  shipping_lines: WCShippingLine[];
  fee_lines:      WCFeeLine[];
  coupon_lines:   WCCouponLine[];
  shipping_total: string;
  discount_total: string;
  total:          string;
  payment_method_title: string;
  customer_note: string;
}

export interface OrderDetail {
  id: number;
  number: string;
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
    const res = await wcClient.get(`/orders/${id}`);
    const o = res.data as WCOrder;

    const detail: OrderDetail = {
      id: o.id,
      number: o.number,
      status: o.status,
      dateCreated:   o.date_created?.slice(0, 10)  ?? '',
      dateCompleted: o.date_completed?.slice(0, 10) ?? null,
      customer: {
        name:    `${o.billing.first_name} ${o.billing.last_name}`.trim(),
        email:   o.billing.email   ?? '',
        phone:   o.billing.phone   ?? '',
        address: [o.billing.address_1, o.billing.address_2, o.billing.city, o.billing.state]
          .filter(Boolean).join(', '),
      },
      items: o.line_items.map(i => ({
        name:     i.name,
        quantity: i.quantity,
        price:    i.price,
        total:    parseFloat(i.total) || 0,
      })),
      shippingMethod: o.shipping_lines[0]?.method_title ?? '',
      shippingTotal:  parseFloat(o.shipping_total)  || 0,
      discountTotal:  parseFloat(o.discount_total)  || 0,
      fees: o.fee_lines.map(f => ({ name: f.name, total: parseFloat(f.total) || 0 })),
      total:         parseFloat(o.total) || 0,
      paymentMethod: o.payment_method_title ?? '',
      customerNote:  o.customer_note ?? '',
    };

    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
