import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SystemStatus } from './system-status';
import type { HealthStatus } from '@/app/api/health/route';

// Helper do tworzenia odpowiedzi health
function createHealthResponse(
  status: HealthStatus['status'],
  dbStatus: 'up' | 'down' = 'up',
  authStatus: 'up' | 'down' = 'up'
): HealthStatus {
  return {
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: { status: dbStatus, latency: 5 },
      auth: { status: authStatus },
    },
    version: '1.0.0',
  };
}

describe('SystemStatus', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wyświetla stan ładowania na początku', () => {
    // Fetch nigdy się nie rozwiązuje
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<SystemStatus />);

    expect(screen.getByText('Sprawdzanie...')).toBeInTheDocument();
    expect(screen.getByText('Status systemu:')).toBeInTheDocument();
  });

  it('wyświetla status Operational gdy wszystko działa', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(createHealthResponse('operational')),
    });

    render(<SystemStatus />);

    await waitFor(() => {
      expect(screen.getByText('Operational')).toBeInTheDocument();
    });
  });

  it('wyświetla status Degraded gdy są problemy z auth', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(createHealthResponse('degraded', 'up', 'down')),
    });

    render(<SystemStatus />);

    await waitFor(() => {
      expect(screen.getByText('Degraded')).toBeInTheDocument();
    });
  });

  it('wyświetla status Outage gdy baza danych nie działa', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(createHealthResponse('outage', 'down', 'up')),
    });

    render(<SystemStatus />);

    await waitFor(() => {
      expect(screen.getByText('Outage')).toBeInTheDocument();
    });
  });

  it('wyświetla status Niedostępny gdy fetch się nie powiedzie', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<SystemStatus />);

    await waitFor(() => {
      expect(screen.getByText('Niedostępny')).toBeInTheDocument();
    });
  });

  it('wywołuje fetch przy montowaniu komponentu', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(createHealthResponse('operational')),
    });

    render(<SystemStatus />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('pokazuje szczegóły serwisów gdy showDetails=true', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(createHealthResponse('operational')),
    });

    render(<SystemStatus showDetails />);

    await waitFor(() => {
      expect(screen.getByText('Operational')).toBeInTheDocument();
    });

    // Po załadowaniu sprawdzamy szczegóły
    expect(screen.getByText(/DB/)).toBeInTheDocument();
    expect(screen.getByText(/Auth/)).toBeInTheDocument();
    expect(screen.getByText(/5ms/)).toBeInTheDocument();
  });

  it('nie pokazuje szczegółów serwisów domyślnie', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(createHealthResponse('operational')),
    });

    render(<SystemStatus />);

    await waitFor(() => {
      expect(screen.getByText('Operational')).toBeInTheDocument();
    });

    expect(screen.queryByText(/DB/)).not.toBeInTheDocument();
  });

  it('wywołuje fetch z cache: no-store', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(createHealthResponse('operational')),
    });

    render(<SystemStatus />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/health', { cache: 'no-store' });
    });
  });
});
