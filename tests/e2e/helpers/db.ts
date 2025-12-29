import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from '@/lib/db/schema';
import * as fs from 'fs';
import * as path from 'path';

const SERVER_INFO_PATH = path.join(__dirname, '../../.server-info.json');

export async function getTestDb() {
  if (!fs.existsSync(SERVER_INFO_PATH)) {
    throw new Error(`Brak pliku ${SERVER_INFO_PATH}. Uruchom testy przez Playwright.`);
  }

  const info = JSON.parse(fs.readFileSync(SERVER_INFO_PATH, 'utf-8'));
  const connectionString = info.testDbUrl;

  if (!connectionString) {
    throw new Error('Brak testDbUrl w .server-info.json');
  }

  const client = new Client({ connectionString });
  await client.connect();
  return { db: drizzle(client, { schema }), client };
}

export async function createTestUser(db: any) {
  const email = `e2e-user-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  // Hasło jest hashowane w aplikacji, ale w testach możemy wstrzyknąć zahashowane lub użyć Magic Link (jeśli obsługiwane).
  // Zakładam, że testujemy Credentials Provider. W realnej aplikacji hasło musi być zahashowane.
  // Tutaj dla uproszczenia wstawiamy użytkownika i będziemy testować logowanie jeśli mamy kontrolę nad hashowaniem lub mockujemy auth.
  // ALE w E2E testujemy "black box".
  // Jeśli nie mamy funkcjonalności rejestracji w UI, musimy wstrzyknąć użytkownika z POPRAWNYM hashem hasła.
  // Załóżmy, że używamy bcryptjs (standard w NextAuth credentials).

  // Wstrzykuję usera bez hasła, jeśli używamy Magic Link, albo muszę wiedzieć jak hashować.
  // Zobaczmy authOptions, ale nie mam dostępu łatwo.
  // Zostawmy hasło na później. Spróbujmy stworzyć usera.

  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      name: 'E2E Test User',
      emailVerified: new Date(),
    })
    .returning();
  return user;
}

export async function createTestProject(db: any, ownerId: string, isPublic = true) {
  const slug = `e2e-project-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const [project] = await db
    .insert(schema.projects)
    .values({
      name: `E2E Project ${slug}`,
      slug,
      ownerId,
      isPublic: isPublic ? 'true' : 'false',
      domain: 'http://localhost:3000', // Dla testów przekierowań
      apiKey: `e2e-key-${Math.random().toString(36).substring(7)}`,
    })
    .returning();
  return project;
}

export async function insertAuthCode(
  client: Client,
  code: string,
  userId: string,
  projectId: string,
  redirectUri: string,
  expiresAt: Date
) {
  // Używamy bezpośredniego klienta PostgreSQL aby uniknąć problemów z kolumnami PKCE
  await client.query(
    `INSERT INTO "centrum_logowania"."authorization_code" 
     (code, user_id, project_id, redirect_uri, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [code, userId, projectId, redirectUri, expiresAt]
  );
}
