'use server';

import { signIn } from '@/lib/auth';

export const socialLogin = async (provider: 'google') => {
  await signIn(provider, { redirectTo: '/dashboard' });
};
