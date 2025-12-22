import { pgSchema, text, timestamp, boolean, uuid, integer, primaryKey } from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters"

export const mySchema = pgSchema("centrum_logowania");

// --- Auth Core ---

export const users = mySchema.table("user", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    password: text("password"), // Dla credentials provider
    role: text("role").default("user"), // user | admin
    tokenVersion: integer("token_version").default(1),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const accounts = mySchema.table("account", {
    userId: uuid("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
}, (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] })
]);

export const sessions = mySchema.table("session", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: uuid("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = mySchema.table("verificationToken", {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => [
    primaryKey({ columns: [vt.identifier, vt.token] })
]);

// --- Multi-tenancy / Projects ---
// Tabela przechowująca informacje o zewnętrznych aplikacjach (projektach), które korzystają z tego systemu logowania.

export const projects = mySchema.table("project", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(), // np. "moj-projekt-a"
    domain: text("domain"), // np. "app.mojprojekt.pl" - do walidacji redirectów
    description: text("description"),
    ownerId: uuid("ownerId").references(() => users.id), // Właściciel projektu (admin w tym systemie)
    apiKey: text("api_key").unique(), // Klucz API dla projektu do komunikacji z backendem tego systemu
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
