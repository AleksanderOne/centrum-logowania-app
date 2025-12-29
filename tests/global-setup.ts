import { spawn, ChildProcess } from 'child_process';
import getPort from 'get-port';
import * as fs from 'fs';
import * as path from 'path';

const SERVER_INFO_FILE = path.join(__dirname, '.server-info.json');
const SERVER_TIMEOUT = 120000;

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

export default async function globalSetup() {
  console.log('\n🚀 Uruchamianie serwera testowego...');

  const port = await getPort({ port: [3000, 3001, 3002, 3003, 3004] });

  console.log(`📡 Znaleziono wolny port: ${port}`);

  // Używamy npx next dev bezpośrednio żeby ominąć predev hook (git pull)
  serverProcess = spawn('npx', ['next', 'dev', '--port', String(port)], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,

      NODE_ENV: 'development',
      AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret-for-e2e-tests-only',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test-secret-for-e2e-tests-only',
      AUTH_TRUST_HOST: 'true',

      DATABASE_URL: process.env.DATABASE_URL,
      E2E_TEST_MODE: 'true',
      NEXT_PUBLIC_E2E_TEST_MODE: 'true',
    },
  });

  fs.writeFileSync(
    SERVER_INFO_FILE,
    JSON.stringify({ port, pid: serverProcess.pid, startTime: Date.now() })
  );

  process.env.PLAYWRIGHT_BASE_URL = `http://localhost:${port}`;

  const isReady = await waitForServer(port, SERVER_TIMEOUT);
  if (!isReady) throw new Error(`Serwer nie uruchomił się na porcie ${port}`);

  console.log(`✅ Serwer testowy gotowy: http://localhost:${port}\n`);
}
