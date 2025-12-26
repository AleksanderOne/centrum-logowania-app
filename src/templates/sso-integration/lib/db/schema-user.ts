/**
 * Template schematu użytkownika dla Drizzle ORM
 *
 * UŻYCIE:
 * 1. Skopiuj do lib/db/schema.ts
 * 2. Uruchom: npx drizzle-kit generate
 * 3. Uruchom: npx drizzle-kit migrate
 */

import { pgTable, varchar, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  image: text('image'),
  role: varchar('role', { length: 20 }).default('user').$type<'user' | 'admin'>(),
  isBlocked: boolean('is_blocked').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  // Dodaj własne pola specyficzne dla aplikacji:
  // preferences: text('preferences'), // JSON string
  // lastLoginAt: timestamp('last_login_at'),
});

// Typ dla TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
