import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db/drizzle';
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import authConfig from '@/lib/auth.config';
import { logSuccess, logFailure, isEmailDomainAllowed } from '@/lib/security';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  ...authConfig,
  // Tylko providery z authConfig (Google)
  providers: [
    ...authConfig.providers,
    Credentials({
      id: 'e2e-bypass',
      name: 'E2E Bypass',
      credentials: { email: { type: 'text' } },
      async authorize(credentials) {
        if (process.env.E2E_TEST_MODE !== 'true') return null;
        const email = credentials.email as string;
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        return user || null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Tylko Google logowanie (oraz E2E bypass)
      if (account?.provider !== 'google' && account?.provider !== 'e2e-bypass') {
        await logFailure('login', {
          metadata: { reason: 'invalid_provider', provider: account?.provider },
        });
        return false;
      }

      if (!user.email) {
        await logFailure('login', {
          metadata: { reason: 'missing_email' },
        });
        return false;
      }

      // Sprawdzenie Email Domain Whitelist
      if (!isEmailDomainAllowed(user.email)) {
        await logFailure('login', {
          metadata: {
            reason: 'email_domain_not_allowed',
            email: user.email,
            domain: user.email.split('@')[1],
          },
        });
        return false;
      }

      // Sprawdź czy użytkownik istnieje w bazie
      const dbUser = await db.query.users.findFirst({
        where: eq(users.email, user.email),
      });

      /**
       * TODO: [BEZPIECZEŃSTWO] [REJESTRACJA]
       * Tymczasowo wyłączono blokadę "user_not_registered", aby umożliwić automatyczną
       * rejestrację nowych użytkowników przez Google.
       * W produkcyjnej wersji warto rozważyć whitelisting domen lub system zaproszeń.
       */
      /*
      if (!dbUser) {
        await logFailure('login', {
          metadata: { reason: 'user_not_registered', email: user.email },
        });
        return false;
      }
      */

      // Logowanie sukcesu
      await logSuccess('login', {
        userId: dbUser?.id || user.id,
        metadata: { email: user.email, provider: 'google' },
      });

      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    // Weryfikacja wersji tokena przy każdej akcji
    async jwt({ token, user, trigger, session }) {
      // 1. Logowanie: ustaw wersję tokena z bazy
      if (user) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email!),
        });
        // Jeśli user przeszedł signIn, to dbUser powinien istnieć,
        // ale dla bezpieczeństwa sprawdzamy
        token.tokenVersion = dbUser?.tokenVersion || 1;
      }

      // 2. Obsługa update'u ręcznego (opcjonalne)
      if (trigger === 'update' && session?.tokenVersion) {
        token.tokenVersion = session.tokenVersion;
      }

      // 3. Weryfikacja (przy każdym requeście używającym tokena)
      // Musimy sprawdzić w bazie, czy wersja się zgadza.
      // UWAGA: To dodaje zapytanie do bazy przy każdym chronionym requeście.
      // Daję tutaj 'sub' jako ID użytkownika

      if (token.sub) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.sub),
        });

        if (!dbUser || (dbUser.tokenVersion && dbUser.tokenVersion !== token.tokenVersion)) {
          // Jeśli użytkownik nie istnieje lb wersja się nie zgadza -> inwaliduj token
          return null;
        }
      }

      return token;
    },
  },
});
