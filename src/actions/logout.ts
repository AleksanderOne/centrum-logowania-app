'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export const logoutAllDevices = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Nie jesteś zalogowany!' };
  }

  // Inkrementacja wersji tokena w bazie
  // Spowoduje to, że wszystkie stare tokeny (z niższą wersją) przestaną działać
  await db
    .update(users)
    .set({
      tokenVersion: sql`${users.tokenVersion} + 1`,
    })
    .where(eq(users.id, session.user.id));

  return { success: 'Wylogowano ze wszystkich urządzeń!' };
};
