import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/lib/db/schema';
import { users, projects, authorizationCodes, projectSessions } from '@/lib/db/schema';
import path from 'path';
import fs from 'fs';

// Tworzymy instancję PGlite (w pamięci)
const client = new PGlite();

// Eksportujemy bazę danych specyficzną dla testów
export const testDb = drizzle(client, { schema });

/**
 * Inicjalizuje bazę danych testową
 */
export async function initializeTestDb() {
  const migrationsDir = path.resolve(process.cwd(), 'drizzle');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // console.log(`🚀 Inicjalizacja bazy PGlite (${files.length} migracji)...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Czyścimy specjalne znaczniki drizzle-kit i dzielimy na pojedyncze komendy
    // Dzielimy po statement-breakpoint LUB po prostu puszczamy całość
    // ale ignorujemy błędy o powielonych relacjach.
    const statements = sql.split('--> statement-breakpoint');

    for (const rawStatement of statements) {
      const statement = rawStatement.trim();
      if (!statement) continue;

      try {
        await client.exec(statement);
      } catch (e: any) {
        // Ignorujemy błędy o już istniejących tabelach/kolumnach/indeksach
        // 42P07 = relation already exists
        // 42701 = column already exists
        // 42P01 = undefined table (może się zdarzyć przy dropach)
        if (e.code === '42P07' || e.code === '42701') {
          // console.log(`ℹ️ Pominięto istniejący element w ${file}`);
          continue;
        }
        console.error(`❌ Błąd w migracji ${file}:`, e);
        throw e;
      }
    }
  }
  // console.log('✅ Baza danych zainicjalizowana pomyślnie.');
}

export async function cleanupTestData() {
  try {
    await testDb.delete(projectSessions);
    await testDb.delete(authorizationCodes);
    await testDb.delete(projects);
    await testDb.delete(users);
  } catch (_e) {
    // Ignorujemy błędy jeśli tabele jeszcze nie istnieją
  }
}

export async function setupTestEnvironment() {
  await initializeTestDb();
  await cleanupTestData();

  const testEmail = `test-user-${Math.random().toString(36).substring(7)}@example.com`;
  const testSlug = `test-project-${Math.random().toString(36).substring(7)}`;

  // Tworzymy użytkownika
  const [user] = await testDb
    .insert(users)
    .values({
      email: testEmail,
      name: 'Test Integration User',
      tokenVersion: 1,
    })
    .returning();

  // Tworzymy projekt
  const [project] = await testDb
    .insert(projects)
    .values({
      name: 'Test Integration Project',
      slug: testSlug,
      apiKey: `test_key_${Math.random().toString(36).substring(7)}`,
      ownerId: user.id,
      isPublic: 'true',
    })
    .returning();

  return {
    user,
    project,
    cleanup: cleanupTestData,
  };
}
