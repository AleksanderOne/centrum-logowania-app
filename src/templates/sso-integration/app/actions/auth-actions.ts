'use server';

import { clearSSOSession } from '@/lib/sso-client';
import { redirect } from 'next/navigation';

/**
 * Server Action do wylogowania
 * 
 * Użycie:
 * <form action={logout}>
 *     <button type="submit">Wyloguj</button>
 * </form>
 */
export async function logout() {
    await clearSSOSession();
    redirect('/login');
}
