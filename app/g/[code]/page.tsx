import type { Metadata } from 'next';
import { fetchOrderById } from '@/lib/commerce/orders';
import { certFromOrder, toWarrantyOrder } from '@/lib/warranty';
import { verifyWarrantyCode } from '@/lib/warrantyLink';
import PublicCertificate from './PublicCertificate';

// Public, customer-facing guarantee certificate. The only thing reachable
// without logging in: one order's certificate, behind its signed link.

export const metadata: Metadata = {
  title: 'Timbered Guarantee Certificate',
  robots: { index: false, follow: false },
};

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#FBF5EC' }}>
      <div style={{ maxWidth: 420, textAlign: 'center', fontFamily: 'Georgia, serif', color: '#2B2620' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 10px' }}>{title}</h1>
        <p style={{ fontSize: 14, color: '#6B6660', margin: 0 }}>{body}</p>
      </div>
    </div>
  );
}

const CONTACT = 'Please message us on WhatsApp at 01003332255 and we will help.';

export default async function GuaranteePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const orderNumber = verifyWarrantyCode(code);
  if (!orderNumber) return <Message title="Certificate not found" body={`This link isn't valid. ${CONTACT}`} />;

  let order;
  try {
    order = await fetchOrderById(orderNumber);
  } catch {
    return <Message title="Please try again" body={`We couldn't load your certificate right now. ${CONTACT}`} />;
  }
  if (!order || order.status === 'cancelled') {
    return <Message title="Certificate not available" body={`We couldn't find an active order for this link. ${CONTACT}`} />;
  }

  return <PublicCertificate cert={certFromOrder(toWarrantyOrder(order))} />;
}
