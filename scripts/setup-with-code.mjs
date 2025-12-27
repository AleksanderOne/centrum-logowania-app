#!/usr/bin/env node
/**
 * Skrypt do konfiguracji nowej aplikacji za pomocą Setup Code.
 *
 * Użycie:
 *   node scripts/setup-with-code.mjs SETUP_CODE
 *
 * Przykład:
 *   node scripts/setup-with-code.mjs setup_abc123...
 *
 * Skrypt:
 * 1. Pobiera konfigurację z Centrum Logowania używając Setup Code
 * 2. Zapisuje do pliku .env.local (lub wyświetla do skopiowania)
 */

const CENTRUM_URL = process.env.CENTRUM_URL || 'http://localhost:3000';

async function main() {
    const setupCode = process.argv[2];

    if (!setupCode) {
        console.error('❌ Błąd: Podaj Setup Code jako argument');
        console.error('');
        console.error('Użycie:');
        console.error('  node scripts/setup-with-code.mjs SETUP_CODE');
        console.error('');
        console.error('Setup Code możesz wygenerować w dashboardzie Centrum Logowania:');
        console.error(`  ${CENTRUM_URL}/dashboard → Twój Projekt → Setup Codes`);
        process.exit(1);
    }

    if (!setupCode.startsWith('setup_')) {
        console.error('❌ Błąd: Nieprawidłowy format kodu. Kod powinien zaczynać się od "setup_"');
        process.exit(1);
    }

    console.log('🔄 Pobieranie konfiguracji z Centrum Logowania...');
    console.log(`   URL: ${CENTRUM_URL}/api/v1/projects/claim`);

    try {
        const response = await fetch(`${CENTRUM_URL}/api/v1/projects/claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ setupCode }),
        });

        if (!response.ok) {
            const error = await response.json();

            if (response.status === 410) {
                console.error('❌ Błąd: Kod został już użyty lub wygasł');
                console.error('   Wygeneruj nowy kod w dashboardzie.');
            } else if (response.status === 404) {
                console.error('❌ Błąd: Nieprawidłowy kod');
                console.error('   Sprawdź czy kod został poprawnie skopiowany.');
            } else {
                console.error(`❌ Błąd: ${error.error || 'Nieznany błąd'}`);
            }
            process.exit(1);
        }

        const config = await response.json();

        console.log('');
        console.log('✅ Konfiguracja pobrana pomyślnie!');
        console.log('');
        console.log('📋 Szczegóły projektu:');
        console.log(`   Nazwa: ${config.projectName}`);
        console.log(`   Slug: ${config.slug}`);
        console.log(`   ID: ${config.projectId}`);
        console.log('');
        console.log('📝 Dodaj do pliku .env.local:');
        console.log('');
        console.log('───────────────────────────────────────');
        console.log(`# Centrum Logowania - ${config.projectName}`);
        console.log(`CENTRUM_LOGOWANIA_URL=${config.centerUrl}`);
        console.log(`CENTRUM_LOGOWANIA_API_KEY=${config.apiKey}`);
        console.log(`CENTRUM_LOGOWANIA_SLUG=${config.slug}`);
        console.log('───────────────────────────────────────');
        console.log('');
        console.log('🚀 Gotowe! Teraz możesz używać SSO z Centrum Logowania.');

    } catch (error) {
        console.error('❌ Błąd połączenia:', error.message);
        console.error(`   Sprawdź czy Centrum Logowania jest dostępne pod: ${CENTRUM_URL}`);
        process.exit(1);
    }
}

main();
