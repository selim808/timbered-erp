import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ExtraPage {
  slug: string;
  title: string;
  file_name: string;
  password_hash: string;
}

const KEY_LEN = 64;

/** scrypt:<salt-hex>:<hash-hex> — the shape stored in extra_pages.password_hash. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  // A malformed hash must never compare equal — timingSafeEqual on two empty
  // buffers returns true.
  if (expected.length !== KEY_LEN) return false;

  return timingSafeEqual(expected, scryptSync(password, salt, KEY_LEN));
}

/**
 * Cookie value proving the holder typed the right password. Bound to both the
 * slug and the current hash, so changing a page's password instantly locks out
 * everyone who already unlocked it.
 */
export function accessToken(page: Pick<ExtraPage, 'slug' | 'password_hash'>): string {
  const secret = process.env.EXTRAS_SECRET;
  if (!secret) {
    // Fail closed: without a secret the token would be forgeable.
    throw new Error('EXTRAS_SECRET is not set — extra pages are disabled.');
  }
  return createHmac('sha256', secret)
    .update(`${page.slug}:${page.password_hash}`)
    .digest('hex');
}

export function cookieName(slug: string): string {
  return `extra_${slug.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export async function getExtraPage(slug: string): Promise<ExtraPage | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('extra_pages')
    .select('slug, title, file_name, password_hash')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  return data ?? null;
}

/** Reads the HTML from content/extras — basename() keeps file_name from escaping it. */
export async function readExtraHtml(fileName: string): Promise<string> {
  const dir = path.join(process.cwd(), 'content', 'extras');
  return readFile(path.join(dir, path.basename(fileName)), 'utf8');
}
