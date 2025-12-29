import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SERVER_INFO_FILE = path.join(__dirname, '.server-info.json');

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

export default async function globalTeardown() {
  console.log('\n🧹 Sprzątanie po testach...');

  if (!fs.existsSync(SERVER_INFO_FILE)) return;

  try {
    const info = JSON.parse(fs.readFileSync(SERVER_INFO_FILE, 'utf-8'));
    process.kill(info.pid, 'SIGTERM');
    await new Promise((r) => setTimeout(r, 1000));
    killProcessOnPort(info.port);
    fs.unlinkSync(SERVER_INFO_FILE);
    console.log(`✅ Serwer zatrzymany (PID: ${info.pid})\n`);
  } catch (e) {
    console.error('⚠️ Błąd podczas sprzątania:', e);
  }
}
