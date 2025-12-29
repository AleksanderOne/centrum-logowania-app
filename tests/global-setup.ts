import { spawn, ChildProcess } from 'child_process';
import getPort from 'get-port';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const SERVER_INFO_FILE = path.join(__dirname, '.server-info.json');
const SERVER_TIMEOUT = 120000;
const TEST_DB_NAME = 'centrum_logowania_e2e_test';

let serverProcess: ChildProcess | null = null;

async function waitForServer(port: number, timeout: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}`);
      if (res.ok || res.status === 200) return true;
    } catch {
      // Serwer jeszcze nie gotowy
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function setupTestDatabase(): Promise<string | undefined> {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ Brak DATABASE_URL, pomijam konfigurację bazy dedykowanej.');
    return undefined;
  }

  // URL do domyślnej bazy 'postgres' w celu zarządzania bazami
  // Zakładamy standardowy format: postgres://user:pass@host:port/db
  const adminUrl = process.env.DATABASE_URL.replace(/\/[^/?]+(\?|$)/, '/postgres$1');
  const testDbUrl = process.env.DATABASE_URL.replace(/\/[^/?]+(\?|$)/, `/${TEST_DB_NAME}$1`);

  console.log(`🛠️ Przygotowywanie bazy danych E2E: ${TEST_DB_NAME}...`);

  const client = new Client({ connectionString: adminUrl });
  try {
    await client.connect();
    // Odłącz innych użytkowników jeśli istnieją (dla pewności, choć baza powinna być tylko nasza)
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid()
    `);
    await client.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
    await client.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
  } catch (e: any) {
    if (e.code === 'ECONNREFUSED') {
      console.error('\n🛑 KRYTYCZNY BŁĄD: Nie można połączyć się z PostgreSQL!');
      console.error(
        '👉 Wygląda na to, że serwer bazy danych nie działa lub nie jest zainstalowany.'
      );
      console.error('👉 Aby uruchomić testy E2E, musisz mieć lokalnie działającego Postgresa.');
      console.error(`👉 Próba połączenia z adresem: ${adminUrl}`);
      console.error('👉 Upewnij się, że baza działa i dane w pliku .env są poprawne.\n');
    } else {
      console.error('❌ Błąd podczas tworzenia bazy testowej:', e);
    }
    throw e;
  } finally {
    await client.end();
  }

  // Uruchom migracje na nowej bazie
  const migrationClient = new Client({ connectionString: testDbUrl });
  try {
    await migrationClient.connect();
    const db = drizzle(migrationClient);

    // console.log('📦 Uruchamianie migracji...');
    await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
    // console.log('✅ Migracje zakończone sukcesem.');
  } catch (e) {
    console.error('❌ Błąd podczas migracji:', e);
    throw e;
  } finally {
    await migrationClient.end();
  }

  return testDbUrl;
}

export default async function globalSetup() {
  console.log('\n🚀 Inicjalizacja środowiska E2E...');

  // 1. Przygotuj czystą bazę danych
  const testDbUrl = await setupTestDatabase();

  console.log('🚀 Uruchamianie serwera testowego...');
  const port = await getPort({ port: [3000, 3001, 3002, 3003, 3004] });

  // 2. Uruchom aplikację Next.js z podmienionym DATABASE_URL
  serverProcess = spawn('npx', ['next', 'dev', '--port', String(port)], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'development',

      // Nadpisujemy bazę danych na naszą czystą testową
      DATABASE_URL: testDbUrl || process.env.DATABASE_URL,

      AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret-for-e2e-tests-only',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test-secret-for-e2e-tests-only',
      AUTH_TRUST_HOST: 'true',
      E2E_TEST_MODE: 'true',
      NEXT_PUBLIC_E2E_TEST_MODE: 'true',
    },
  });

  fs.writeFileSync(
    SERVER_INFO_FILE,
    JSON.stringify({ port, pid: serverProcess.pid, startTime: Date.now(), testDbUrl })
  );

  process.env.PLAYWRIGHT_BASE_URL = `http://localhost:${port}`;

  const isReady = await waitForServer(port, SERVER_TIMEOUT);
  if (!isReady) throw new Error(`Serwer nie uruchomił się na porcie ${port}`);

  console.log(`✅ Serwer testowy gotowy: http://localhost:${port} (DB: ${TEST_DB_NAME})\n`);
}
