import 'dotenv/config';
import { Client } from 'pg';

async function setupSchema() {
  console.warn('Tworzenie schematu bazy danych...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    await client.query(`CREATE SCHEMA IF NOT EXISTS centrum_logowania;`);
    console.warn('✅ Schemat "centrum_logowania" został utworzony/zweryfikowany.');
    await client.end();
  } catch (err) {
    console.error('❌ Błąd:', err);
    process.exit(1);
  }
}

setupSchema();
