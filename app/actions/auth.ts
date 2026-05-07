'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function ownerLogin(formData: FormData) {
  const pin = formData.get('pin') as string;

  if (pin !== process.env.OWNER_PIN) {
    return { error: 'Incorrect PIN' };
  }

  const cookieStore = await cookies();
  cookieStore.set('owner_session', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  redirect('/owner/dashboard');
}

export async function ownerLogout() {
  const cookieStore = await cookies();
  cookieStore.delete('owner_session');
  redirect('/login');
}
