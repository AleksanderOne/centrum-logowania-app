import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Client } from 'pg';

const SERVER_INFO_FILE = path.join(__dirname, '.server-info.json');
const TEST_DB_NAME = 'centrum_logowania_e2e_test';

function killProcessOnPort(port: number): void {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(parseInt(pid), 'SIGKILL');
      } catch {
        // Ignoruj błędy
      }
    }
  } catch {
    // Ignoruj błędy
  }
}

async function dropTestDatabase(dbUrl: string) {
  if (!dbUrl.includes(TEST_DB_NAME)) return;

  const adminUrl = dbUrl.replace(/\/[^/?]+(\?|$)/, '/postgres$1');
  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    // Najpierw musimy ubić wszystkie połączenia do tej bazy (np. z Next.js)
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB_NAME}' AND pid <> pg_backend_pid()
    `);
    await client.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
    console.log(`✅ Baza testowa usunięta: ${TEST_DB_NAME}`);
  } catch (e) {
    console.error('⚠️ Nie udało się usunąć bazy testowej:', e);
  } finally {
    await client.end();
  }
}

export default async function globalTeardown() {
  console.log('\n🧹 Sprzątanie po testach...');

  if (!fs.existsSync(SERVER_INFO_FILE)) return;

  try {
    const info = JSON.parse(fs.readFileSync(SERVER_INFO_FILE, 'utf-8'));

    // 1. Zabij serwer
    try {
      if (info.pid) process.kill(info.pid, 'SIGTERM');
    } catch {
      /* ignore */
    }

    await new Promise((r) => setTimeout(r, 1000));
    killProcessOnPort(info.port);
    console.log(`✅ Serwer zatrzymany (PID: ${info.pid})`);

    // 2. Usuń bazę danych
    if (info.testDbUrl) {
      await dropTestDatabase(info.testDbUrl);
    }

    fs.unlinkSync(SERVER_INFO_FILE);
  } catch (e) {
    console.error('⚠️ Błąd podczas sprzątania:', e);
  }
  console.log('');
}
