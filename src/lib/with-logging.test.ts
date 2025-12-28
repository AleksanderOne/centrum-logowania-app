import { describe, it, expect, vi } from 'vitest';
import { withLogging } from './with-logging';
import { NextRequest, NextResponse } from 'next/server';
import { httpLog } from './debug-logger';

// Mock httpLog
vi.mock('./debug-logger', () => ({
  httpLog: vi.fn(),
  serverLog: vi.fn(), // Include other exports just in case
}));

describe('withLogging HOC', () => {
  // Mock NextRequest seems needed.
  // We can just cast an object to NextRequest for simplicity if we don't use methods that require real implementation.

  it('wykonuje handler i loguje request', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
    const wrappedHandler = withLogging(handler);

    const req = {
      method: 'GET',
      nextUrl: { pathname: '/api/test' },
    } as unknown as NextRequest;

    const res = await wrappedHandler(req);

    expect(handler).toHaveBeenCalledWith(req);
    expect(res.status).toBe(200);
    expect(httpLog).toHaveBeenCalledWith('GET', '/api/test', 200, expect.any(Number));
  });

  it('przekazuje argumenty do handlera', async () => {
    const handler = vi.fn().mockResolvedValue(new NextResponse());
    const wrappedHandler = withLogging(handler);

    const req = {
      method: 'POST',
      nextUrl: { pathname: '/api/post' },
    } as unknown as NextRequest;
    const arg1 = { params: { id: '1' } };

    await wrappedHandler(req, arg1);

    expect(handler).toHaveBeenCalledWith(req, arg1);
  });
});
