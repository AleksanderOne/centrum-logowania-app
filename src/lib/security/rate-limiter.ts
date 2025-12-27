/**
 * Rate Limiter - Ochrona przed brute force i DDoS
 *
 * Limituje liczbę requestów per klucz (IP + endpoint) w oknie czasowym.
 * Wykorzystuje bazę danych PostgreSQL do przechowywania stanu.
 */

import { db } from '@/lib/db/drizzle';
import { rateLimitEntries } from '@/lib/db/schema';
import { eq, and, gt, lt } from 'drizzle-orm';

export interface RateLimitConfig {
  windowMs: number; // Okno czasowe w milisekundach
  maxRequests: number; // Maksymalna liczba requestów w oknie
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

// Domyślne konfiguracje dla różnych typów endpointów
export const RATE_LIMIT_CONFIGS = {
  // Logowanie - bardziej restrykcyjne
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minut
    maxRequests: 10, // 10 prób
  },
  // API token exchange - umiarkowane
  tokenExchange: {
    windowMs: 60 * 1000, // 1 minuta
    maxRequests: 30, // 30 requestów
  },
  // Weryfikacja sesji - liberalne (często wywoływane)
  sessionVerify: {
    windowMs: 60 * 1000, // 1 minuta
    maxRequests: 100, // 100 requestów
  },
  // Ogólne API - standardowe
  api: {
    windowMs: 60 * 1000, // 1 minuta
    maxRequests: 60, // 60 requestów
  },
} as const;

/**
 * Sprawdza rate limit dla danego klucza
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();

  // Szukamy istniejącego wpisu dla tego klucza
  const existing = await db.query.rateLimitEntries.findFirst({
    where: and(eq(rateLimitEntries.key, key), gt(rateLimitEntries.expiresAt, now)),
  });

  if (!existing) {
    // Pierwszy request w oknie - tworzymy nowy wpis
    const expiresAt = new Date(now.getTime() + config.windowMs);

    await db.insert(rateLimitEntries).values({
      key,
      count: 1,
      windowStart: now,
      expiresAt,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: expiresAt,
    };
  }

  // Sprawdzamy czy przekroczono limit
  const currentCount = existing.count || 0;

  if (currentCount >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.expiresAt,
      retryAfterMs: existing.expiresAt.getTime() - now.getTime(),
    };
  }

  // Inkrementujemy licznik
  await db
    .update(rateLimitEntries)
    .set({ count: currentCount + 1 })
    .where(eq(rateLimitEntries.id, existing.id));

  return {
    allowed: true,
    remaining: config.maxRequests - currentCount - 1,
    resetAt: existing.expiresAt,
  };
}

/**
 * Generuje klucz rate limit dla IP + endpoint
 */
export function generateRateLimitKey(ip: string, endpoint: string): string {
  return `ip:${ip}:${endpoint}`;
}

/**
 * Czyści wygasłe wpisy rate limit (do wywołania periodycznie)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const now = new Date();

  const result = await db.delete(rateLimitEntries).where(lt(rateLimitEntries.expiresAt, now));

  // Drizzle nie zwraca rowCount bezpośrednio, więc zwracamy -1 jako placeholder
  return (result as { rowCount?: number }).rowCount ?? -1;
}

/**
 * Helper do pobierania IP z requestu
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}
