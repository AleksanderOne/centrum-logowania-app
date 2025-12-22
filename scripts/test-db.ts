import 'dotenv/config';
import { Client } from 'pg';

async function testConnection() {
    console.log('Testowanie połączenia z bazą danych...');

    if (!process.env.DATABASE_URL) {
        console.error('❌ Błąd: Brak zmiennej DATABASE_URL w pliku .env');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('✅ Połączono z bazą danych pomyślnie!');

        const res = await client.query('SELECT NOW() as now, current_database() as db_name, version()');
        console.log('📊 Informacje o bazie:');
        console.log(`   - Baza: ${res.rows[0].db_name}`);
        console.log(`   - Czas serwera: ${res.rows[0].now}`);
        console.log(`   - Wersja: ${res.rows[0].version}`);

        await client.end();
        console.log('✅ Połączenie zamknięte.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Błąd połączenia:', err);
        process.exit(1);
    }
}

testConnection();
