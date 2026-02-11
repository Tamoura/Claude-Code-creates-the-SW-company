'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function setLocale(locale: string) {
  const cookieStore = await cookies();
  cookieStore.set('locale', locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
}
