import type { CommerceOrder } from './types';

/** Digits only, without a leading country code / trunk zero, so 010…, +2010… and 2010… all match. */
function phoneDigits(s: string): string {
  return s.replace(/\D/g, '').replace(/^(20|0)/, '');
}

/**
 * Free-text order match: order number, customer name, phone, city/area,
 * note, or any item name. Every word of the query must match somewhere.
 */
export function orderMatches(o: CommerceOrder, query: string): boolean {
  const words = query.toLowerCase().replace(/#/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return true;

  const b = o.billing ?? ({} as CommerceOrder['billing']);
  const hay = [
    o.number, String(o.id),
    b.first_name, b.last_name, b.phone, b.address_1, b.address_2, b.city, b.state,
    o.customer_note, o.email,
    ...(o.line_items ?? []).map(li => `${li.name} ${li.sku}`),
  ].filter(Boolean).join(' ').toLowerCase();
  const phone = phoneDigits(String(b.phone ?? ''));

  return words.every(w => {
    if (hay.includes(w)) return true;
    const d = phoneDigits(w);
    return d.length >= 4 && phone.includes(d);
  });
}
