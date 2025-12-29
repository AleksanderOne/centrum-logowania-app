import { NextRequest, NextResponse } from 'next/server';
import { appendToLogFile } from '@/lib/debug-logger';

/**
 * POST /api/v1/public/debug-log
 *
 * Zapisuje logi z klienta (Demo Apps) do pliku logi.txt na serwerze.
 * Działa TYLKO w trybie development.
 */
export async function POST(req: NextRequest) {
  // Blokada dla produkcji
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Endpoint available only in development' }, { status: 403 });
  }

  try {
    // Sprawdź czy body nie jest puste
    const text = await req.text();
    if (!text || text.trim() === '') {
      // Pusty request - ignoruj cicho (może być preflight lub keepalive)
      return NextResponse.json({ success: true, skipped: true });
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      // Nieprawidłowy JSON - ignoruj
      return NextResponse.json({ success: true, skipped: true });
    }

    const { message, data, source } = body;

    // Mapowanie źródła na kategorię
    let category: 'demo-web' | 'cla-web' = 'demo-web';
    if (source && source.includes('CLA')) category = 'cla-web';

    appendToLogFile(category, message, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    // Cichy błąd - nie zaśmiecaj logów serwera
    if (process.env.DEBUG_LOGS === 'true') {
      console.error('Debug Log Error:', error);
    }
    return NextResponse.json({ error: 'Failed to write log' }, { status: 500 });
  }
}

// Obsługa OPTIONS dla CORS (na wszelki wypadek, chociaż next.config.ts to powinien załatwić)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
