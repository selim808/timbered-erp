'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { accessToken, cookieName, getExtraPage, verifyPassword } from '@/lib/extras';

export interface UnlockState {
  error?: string;
}

export async function unlockExtra(
  slug: string,
  _prevState: UnlockState | undefined,
  formData: FormData
): Promise<UnlockState> {
  const password = String(formData.get('password') ?? '');

  const page = await getExtraPage(slug);
  if (!page) return { error: 'This page is no longer available.' };

  if (!password || !verifyPassword(password, page.password_hash)) {
    return { error: 'Incorrect password.' };
  }

  const jar = await cookies();
  jar.set(cookieName(slug), accessToken(page), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    // Scoped to this page only — the browser never sends it anywhere else.
    path: `/extras/${slug}`,
  });

  redirect(`/extras/${slug}`);
}
