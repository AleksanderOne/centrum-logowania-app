import { test, expect } from '@playwright/test';

/**
 * Testy integracyjne dla endpointów API
 *
 * Weryfikują poprawne działanie API bez mockowania,
 * ale bez wymagania pełnej konfiguracji bazy danych.
 */
test.describe('API Endpoints', () => {
  test.describe('/api/health', () => {
    test('zwraca poprawny format odpowiedzi', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Sprawdź strukturę odpowiedzi
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('services');
      expect(data).toHaveProperty('version');

      // Sprawdź services
      expect(data.services).toHaveProperty('database');
      expect(data.services).toHaveProperty('auth');

      // Sprawdź format statusu
      expect(['operational', 'degraded', 'outage']).toContain(data.status);
    });

    test('zwraca nagłówek Cache-Control no-store', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.headers()['cache-control']).toContain('no-store');
    });

    test('timestamp jest w formacie ISO', async ({ request }) => {
      const response = await request.get('/api/health');
      const data = await response.json();

      // Sprawdź czy timestamp to poprawny ISO date
      const date = new Date(data.timestamp);
      expect(date.toISOString()).toBe(data.timestamp);
    });
  });

  test.describe('kolejne żądania health', () => {
    test('health może być wywoływany wielokrotnie', async ({ request }) => {
      // Pierwsze wywołanie
      const response1 = await request.get('/api/health');
      expect(response1.status()).toBe(200);

      // Drugie wywołanie - sprawdzamy że działa konsystentnie
      const response2 = await request.get('/api/health');
      expect(response2.status()).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Struktura powinna być taka sama
      expect(data1.status).toBeDefined();
      expect(data2.status).toBeDefined();
    });
  });

  test.describe('/api/v1/verify', () => {
    test('zwraca 401 bez x-api-key', async ({ request }) => {
      const response = await request.post('/api/v1/verify', {
        data: { token: 'some-token' },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Missing API Key');
    });

    test('zwraca 403 z nieprawidłowym api key', async ({ request }) => {
      const response = await request.post('/api/v1/verify', {
        headers: {
          'x-api-key': 'invalid-api-key-12345',
        },
        data: { token: 'some-token' },
      });

      expect(response.status()).toBe(403);

      const data = await response.json();
      expect(data.error).toBe('Invalid API Key');
    });
  });

  test.describe('/api/v1/token', () => {
    test('zwraca 401 bez x-api-key', async ({ request }) => {
      const response = await request.post('/api/v1/token', {
        data: { code: 'some-code' },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Missing API Key');
    });

    test('zwraca 403 z nieprawidłowym api key', async ({ request }) => {
      const response = await request.post('/api/v1/token', {
        headers: {
          'x-api-key': 'invalid-api-key-12345',
        },
        data: { code: 'some-code' },
      });

      expect(response.status()).toBe(403);

      const data = await response.json();
      expect(data.error).toBe('Invalid API Key');
    });
  });

  test.describe('/api/v1/session/verify', () => {
    test('zwraca 401 bez x-api-key', async ({ request }) => {
      const response = await request.post('/api/v1/session/verify', {
        data: { userId: 'user-123', tokenVersion: 1 },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Missing API Key');
    });

    test('zwraca 403 z nieprawidłowym api key', async ({ request }) => {
      const response = await request.post('/api/v1/session/verify', {
        headers: {
          'x-api-key': 'invalid-api-key-12345',
        },
        data: { userId: 'user-123', tokenVersion: 1 },
      });

      expect(response.status()).toBe(403);

      const data = await response.json();
      expect(data.error).toBe('Invalid API Key');
    });
  });
});
