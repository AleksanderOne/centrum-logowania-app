import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntegrationTester } from './integration-tester';
import { toast } from 'sonner';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('IntegrationTester', () => {
  const defaultProps = {
    projectId: 'test-project-id',
    projectName: 'Test Project',
  };

  const mockSuccessResults = {
    results: {
      domain: {
        status: 'success',
        message: 'Domena dostępna',
        responseTime: 150,
      },
      sessions: {
        status: 'success',
        message: '5 aktywnych sesji',
        count: 5,
        lastActivity: '2024-01-15T10:30:00Z',
      },
      integration: {
        status: 'success',
        message: 'Integracja działa prawidłowo',
      },
    },
  };

  const mockWarningResults = {
    results: {
      domain: {
        status: 'skipped',
        message: 'Brak skonfigurowanej domeny',
      },
      sessions: {
        status: 'warning',
        message: 'Brak aktywnych sesji',
        count: 0,
        lastActivity: null,
      },
      integration: {
        status: 'warning',
        message: 'Integracja wymaga uwagi',
      },
    },
  };

  const mockErrorResults = {
    results: {
      domain: {
        status: 'error',
        message: 'Domena niedostępna',
      },
      sessions: {
        status: 'info',
        message: 'Brak danych o sesjach',
        count: 0,
        lastActivity: null,
      },
      integration: {
        status: 'error',
        message: 'Integracja nie działa',
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderuje przycisk "Testuj integrację"', () => {
    render(<IntegrationTester {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Testuj integrację/i })).toBeInTheDocument();
  });

  it('otwiera dialog i rozpoczyna test po kliknięciu przycisku', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResults,
    });

    render(<IntegrationTester {...defaultProps} />);

    const button = screen.getByRole('button', { name: /Testuj integrację/i });
    fireEvent.click(button);

    // Sprawdź czy dialog się otworzył
    await waitFor(() => {
      expect(screen.getByText('Test integracji')).toBeInTheDocument();
    });

    // Sprawdź czy fetch został wywołany
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/project/test-project-id/test', {
      method: 'POST',
    });
  });

  it('wyświetla stan ładowania podczas testu', async () => {
    let resolvePromise: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch.mockReturnValueOnce(fetchPromise);

    render(<IntegrationTester {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(screen.getByText('Trwa testowanie...')).toBeInTheDocument();
    });

    // Rozwiąż promise
    resolvePromise!({
      ok: true,
      json: async () => mockSuccessResults,
    } as Response);

    await waitFor(() => {
      expect(screen.queryByText('Trwa testowanie...')).not.toBeInTheDocument();
    });
  });

  it('wyświetla wyniki sukcesu poprawnie', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResults,
    });

    render(<IntegrationTester {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(screen.getByText('Domena dostępna')).toBeInTheDocument();
      expect(screen.getByText('Czas odpowiedzi: 150ms')).toBeInTheDocument();
      expect(screen.getByText('5 aktywnych sesji')).toBeInTheDocument();
      expect(screen.getByText('Integracja działa prawidłowo')).toBeInTheDocument();
    });

    expect(toast.success).toHaveBeenCalledWith('Test zakończony!');
  });

  it('wyświetla wyniki z ostrzeżeniem poprawnie', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockWarningResults,
    });

    render(<IntegrationTester {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(screen.getByText('Brak skonfigurowanej domeny')).toBeInTheDocument();
      expect(screen.getByText('Integracja wymaga uwagi')).toBeInTheDocument();
    });
  });

  it('wyświetla wyniki z błędem poprawnie', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockErrorResults,
    });

    render(<IntegrationTester {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(screen.getByText('Domena niedostępna')).toBeInTheDocument();
      expect(screen.getByText('Integracja nie działa')).toBeInTheDocument();
    });
  });

  it('obsługuje błąd sieciowy', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<IntegrationTester {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nie udało się wykonać testu');
    });
  });

  it('obsługuje błąd HTTP', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<IntegrationTester {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nie udało się wykonać testu');
    });
  });

  it('zamyka dialog po kliknięciu "Zamknij"', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResults,
    });

    render(<IntegrationTester {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(screen.getByText('Test integracji')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));

    await waitFor(() => {
      expect(screen.queryByText('Test integracji')).not.toBeInTheDocument();
    });
  });

  it('uruchamia test ponownie po kliknięciu "Testuj ponownie"', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResults,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWarningResults,
      });

    render(<IntegrationTester {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(screen.getByText('Integracja działa prawidłowo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Testuj ponownie/i }));

    await waitFor(() => {
      expect(screen.getByText('Integracja wymaga uwagi')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('nie uruchamia testu ponownie przy otwarciu dialogu gdy wyniki już są', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResults,
    });

    render(<IntegrationTester {...defaultProps} />);

    // Pierwszy klik - otwiera i testuje
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(screen.getByText('Integracja działa prawidłowo')).toBeInTheDocument();
    });

    // Zamknij dialog
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));

    await waitFor(() => {
      expect(screen.queryByText('Test integracji')).not.toBeInTheDocument();
    });

    // Drugi klik - nie powinien uruchomić testu ponownie (są już wyniki)
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(screen.getByText('Test integracji')).toBeInTheDocument();
    });

    // Fetch został wywołany tylko raz
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('wyświetla nazwę projektu w opisie dialogu', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResults,
    });

    render(<IntegrationTester {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('wyświetla wszystkie statusy Badge poprawnie', async () => {
    // Test różnych statusów badge
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResults,
    });

    render(<IntegrationTester {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      // Sprawdzamy czy badge "OK" jest widoczny (dla statusu success)
      expect(screen.getAllByText('OK').length).toBeGreaterThan(0);
    });
  });

  it('wyświetla fallback dla nieznanych statusów', async () => {
    const mockUnknownStatusResults = {
      results: {
        domain: {
          status: 'unknown_status',
          message: 'Nieznany status',
        },
        sessions: {
          status: 'custom',
          message: 'Custom status',
          count: 0,
          lastActivity: null,
        },
        integration: {
          status: 'pending',
          message: 'Oczekuje',
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUnknownStatusResults,
    });

    render(<IntegrationTester {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Testuj integrację/i }));

    await waitFor(() => {
      // Fallback dla nieznanych statusów - wyświetla sam status
      expect(screen.getByText('unknown_status')).toBeInTheDocument();
      expect(screen.getByText('custom')).toBeInTheDocument();
    });
  });
});
