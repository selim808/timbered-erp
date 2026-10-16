import { createHmac, timingSafeEqual } from 'crypto';

// Public guarantee links look like /g/21205-k8f3x9q2m1. The suffix is an HMAC
// of the order number, so a customer can't reach someone else's certificate
// by changing the number. Nothing is stored: the same order always gets the
// same link. Server-only — the secret must never reach the browser.

const SIG_LENGTH = 12;

function secret() {
  // Falls back to the service-role key so links work without extra setup;
  // set WARRANTY_LINK_SECRET to decouple them (changing it voids old links).
  const s = process.env.WARRANTY_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('WARRANTY_LINK_SECRET is not set');
  return s;
}

function sign(orderNumber: string) {
  return createHmac('sha256', secret())
    .update(`warranty:${orderNumber}`)
    .digest('base64url')
    .replace(/[-_]/g, '')
    .slice(0, SIG_LENGTH)
    .toLowerCase();
}

export function warrantyCode(orderNumber: string) {
  return `${orderNumber}-${sign(orderNumber)}`;
}

/** Returns the order number when the code is genuine, otherwise null. */
export function verifyWarrantyCode(code: string): string | null {
  const m = /^([0-9A-Za-z]+)-([0-9a-z]+)$/.exec(code);
  if (!m) return null;
  const [, orderNumber, sig] = m;
  const expected = sign(orderNumber);
  if (sig.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? orderNumber : null;
}
