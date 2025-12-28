import { NextRequest, NextResponse } from 'next/server';
import { httpLog } from './debug-logger';

/**
 * Higher-order function wrapper dla route handlerów.
 * Automatycznie loguje każdy request HTTP z metodą, ścieżką, statusem i czasem wykonania.
 * Działa tylko w trybie development.
 */
export function withLogging<
  T extends (...args: [NextRequest, ...unknown[]]) => Promise<NextResponse>,
>(handler: T): T {
  return (async (req: NextRequest, ...args: unknown[]) => {
    const start = Date.now();
    const response = await handler(req, ...args);
    const duration = Date.now() - start;
    httpLog(req.method, req.nextUrl.pathname, response.status, duration);
    return response;
  }) as T;
}
