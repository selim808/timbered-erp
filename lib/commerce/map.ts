import type { CommerceOrder } from './types';

/** WooCommerce stores Egyptian governorates as numeric codes; Shopify sends names. */
export const EG_STATES: Record<string, string> = {
  '0':'Alexandria','1':'Assuit','2':'Aswan','3':'Bani Suif','4':'Behira',
  '5':'Cairo','6':'Dakahlia','7':'Damietta','8':'El Kalioubia','9':'Fayoum',
  '10':'Gharbia','11':'Giza','12':'Ismailia','13':'Kafr Alsheikh','14':'Luxor',
  '15':'Matrouh','16':'Menya','17':'Monufia','18':'New Valley','19':'North Coast',
  '21':'Port Said','22':'Qena','23':'Red Sea','24':'Sharqia','25':'Sohag',
  '26':'South Sinai','27':'Suez',
};

/** Order-level fields shared by every pipeline view (line items are built per caller). */
export function mapOrderBase(o: CommerceOrder, referenceDateIso: string) {
  const daysOpen = Math.floor((Date.now() - new Date(referenceDateIso).getTime()) / 86400000);
  return {
    id: o.id,
    number: o.number,
    source: o.source,
    dateCreated: referenceDateIso,
    customerName: `${o.billing.first_name} ${o.billing.last_name}`.trim(),
    customerPhone: o.billing.phone,
    customerAddress: o.billing.address_1,
    customerAddress2: o.billing.address_2,
    customerCity: o.billing.city,
    customerState: EG_STATES[o.billing.state] ?? o.billing.state,
    customerNote: o.customer_note,
    total: parseFloat(o.total || '0'),
    daysOpen,
  };
}
