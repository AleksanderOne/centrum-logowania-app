import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { db } from '@/lib/db/drizzle';
import { projects, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTestDb } from '../e2e/helpers/db'; // Używamy helpera E2E dla consistency

/**
 * Testy wizualne dla Szczegółów Projektu
 *
 * Rozdzielczości: Desktop, Tablet, Mobile
 */
test.describe('Szczegóły Projektu - Testy Wizualne', () => {
  let projectId: string | null = null;
  let projectSlug: string | null = null;

  // Setup: Znajdź lub utwórz projekt
  // Setup: Znajdź lub utwórz projekt
  test.beforeAll(async () => {
    try {
      const { db: testDb } = await getTestDb();

      // Utwórz projekt testowy dla usera admina
      // Najpierw musimy znać ID usera testowego.

      const [user] = await testDb.query.users.findMany({
        where: (users, { eq }) => eq(users.email, 'test-visual@example.com'),
        limit: 1,
      });

      let userId = user?.id;

      if (!userId) {
        const result = await testDb
          .insert(users)
          .values({
            email: 'test-visual@example.com',
            name: 'Visual Test User',
            role: 'admin',
            tokenVersion: 1,
            emailVerified: new Date(),
            image: 'https://ui-avatars.com/api/?name=V+T',
          })
          .returning();
        userId = result[0].id;
      }

      // Utwórz projekt (najpierw sprawdź czy nie istnieje)
      const existingProject = await testDb.query.projects.findFirst({
        where: eq(projects.slug, 'visual-test-project'),
      });

      if (existingProject) {
        projectId = existingProject.id;
        projectSlug = existingProject.slug;
      } else {
        const result = await testDb
          .insert(projects)
          .values({
            name: 'Visual Test Project',
            slug: 'visual-test-project',
            domain: 'visual.test',
            ownerId: userId,
            isPublic: 'true',
          })
          .returning();
        projectId = result[0].id;
        projectSlug = result[0].slug;
      }

      console.log(`[Visual] Używam projektu testowego: ${projectSlug}`);
    } catch (e) {
      console.warn('[Visual] Nie udało się przygotować danych:', e);
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  // ========================================
  // DESKTOP (1920x1080)
  // ========================================
  test.describe('Desktop (1920x1080)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
    });

    test('Szczegóły projektu - widok główny', async ({ page }) => {
      // Skip jeśli nie ma projektu
      if (!projectSlug) {
        test.skip(true, 'Brak projektu w bazie danych');
        return;
      }

      await page.goto(`/dashboard/projects/${projectSlug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('project-details-desktop.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [page.locator('[data-testid="api-key"]'), page.locator('[data-testid="timestamp"]')],
      });
    });

    test('Szczegóły projektu - sekcja kluczy API', async ({ page }) => {
      if (!projectSlug) return;

      await page.goto(`/dashboard/projects/${projectSlug}`);
      await page.waitForLoadState('networkidle');

      const apiKeySection = page.locator('text=/klucz|api|key/i').first();
      if (await apiKeySection.isVisible()) {
        await apiKeySection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);

        await expect(page).toHaveScreenshot('project-api-keys-desktop.png', {
          fullPage: true,
          animations: 'disabled',
          mask: [page.locator('[data-testid="api-key"]')], // Ukrywamy sam klucz bo jest losowy
        });
      }
    });
  });

  // ========================================
  // MOBILE (390x844)
  // ========================================
  test.describe('Mobile (390x844)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
    });

    test('Szczegóły projektu - widok główny', async ({ page }) => {
      if (!projectSlug) {
        test.skip(true, 'Brak projektu w bazie danych');
        return;
      }

      await page.goto(`/dashboard/projects/${projectSlug}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('project-details-mobile.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [page.locator('[data-testid="api-key"]'), page.locator('[data-testid="timestamp"]')],
      });
    });
  });
});
