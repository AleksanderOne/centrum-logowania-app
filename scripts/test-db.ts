import 'dotenv/config';
import { Client } from 'pg';

async function testConnection() {
  console.warn('Testowanie połączenia z bazą danych...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Błąd: Brak zmiennej DATABASE_URL w pliku .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.warn('✅ Połączono z bazą danych pomyślnie!');

    const res = await client.query('SELECT NOW() as now, current_database() as db_name, version()');
    console.warn('📊 Informacje o bazie:');
    console.warn(`   - Baza: ${res.rows[0].db_name}`);
    console.warn(`   - Czas serwera: ${res.rows[0].now}`);
    console.warn(`   - Wersja: ${res.rows[0].version}`);

    await client.end();
    console.warn('✅ Połączenie zamknięte.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Błąd połączenia:', err);
    process.exit(1);
  }
}

testConnection();
