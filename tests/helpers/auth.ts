import { Page } from '@playwright/test';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const TEST_USER_EMAIL = 'aleks.jedynak@gmail.com';

export async function loginAsTestUser(page: Page) {
  // 1. Upsert User
  let user = await db.query.users.findFirst({
    where: eq(users.email, TEST_USER_EMAIL),
  });

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        email: TEST_USER_EMAIL,
        name: 'Aleksander Jedynak (Test)',
        role: 'admin',
        tokenVersion: 1,
        image: 'https://ui-avatars.com/api/?name=Aleksander+Jedynak',
      })
      .returning();
    user = newUser;
  }

  // 2. Perform Login via Client Bypass
  // Ensure we are on a page with LoginForm (e.g. root) or navigation triggered valid callbackUrl logic
  // If we are on /dashboard, it redirects to /, preserving callbackUrl.

  // We assume the caller has navigated to a protected page and been redirected to /, OR is just calling this to establish session.
  // If we are NOT on / (login page), force go to /.

  // 3. Sprawdź czy jesteśmy na stronie logowania (szukamy przycisku Google lub nagłówka)
  // Używamy catch() bo na innej domenie isVisible może rzucić błąd kontekstu? Raczej nie, ale dla bezpieczeństwa.
  const isLoginPage = await page
    .getByText('Kontynuuj z Google')
    .isVisible()
    .catch(() => false);

  if (!isLoginPage) {
    await page.goto('/');
  }

  // Wait for hydration/useEffect

  await page.waitForFunction(() => (window as any).e2eLogin);

  // Execute Login
  await page.evaluate((email) => {
    (window as any).e2eLogin(email);
  }, TEST_USER_EMAIL);

  // Wait for navigation away from login (meaning success)
  // Usually redirects to /dashboard or callbackUrl
  await page.waitForURL((url) => url.pathname !== '/');

  return user;
}
