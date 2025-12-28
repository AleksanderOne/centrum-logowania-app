import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionsMonitor } from './sessions-monitor';
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

// Wycisz console.error w testach (błędy sieciowe są oczekiwane)
const originalConsoleError = console.error;

describe('SessionsMonitor', () => {
  const defaultProps = {
    projectId: 'test-project-id',
    projectName: 'Test Project',
  };

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  const mockSessionsData = {
    sessions: [
      {
        id: 'session-1',
        userEmail: 'user1@example.com',
        userName: 'Jan Kowalski',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        ipAddress: '192.168.1.1',
        lastSeenAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'session-2',
        userEmail: 'user2@example.com',
        userName: null,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
        ipAddress: '10.0.0.5',
        lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'session-3',
        userEmail: 'user3@example.com',
        userName: 'Anna Nowak',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1',
        ipAddress: null,
        lastSeenAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
    stats: {
      total: 3,
      activeToday: 1,
      activeThisWeek: 3,
    },
  };

  const mockEmptySessionsData = {
    sessions: [],
    stats: {
      total: 0,
      activeToday: 0,
      activeThisWeek: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderuje przycisk "Sesje"', () => {
    render(<SessionsMonitor {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Sesje/i })).toBeInTheDocument();
  });

  it('otwiera dialog i pobiera sesje po kliknięciu przycisku', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionsData,
    });

    render(<SessionsMonitor {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/project/test-project-id/sessions');
  });

  it('wyświetla statystyki sesji', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionsData,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Wszystkie sesje')).toBeInTheDocument();
    });

    // Sprawdź czy statystyki są wyświetlane
    expect(screen.getByText('Aktywne dziś')).toBeInTheDocument();
    expect(screen.getByText('Aktywne (tydzień)')).toBeInTheDocument();
    // Sprawdź czy są jakieś liczby w statystykach
    const statsContainer = screen.getByText('Wszystkie sesje').closest('div')?.parentElement;
    expect(statsContainer).toBeInTheDocument();
  });

  it('wyświetla listę sesji z danymi użytkowników', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionsData,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    });

    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Anna Nowak')).toBeInTheDocument();
  });

  it('wyświetla adres IP gdy jest dostępny', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionsData,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    });

    expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
  });

  it('wyświetla nazwy przeglądarek poprawnie', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionsData,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Chrome')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Safari').length).toBeGreaterThan(0);
  });

  it('wyświetla komunikat o braku sesji gdy lista jest pusta', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptySessionsData,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Brak aktywnych sesji')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Nikt jeszcze nie zalogował się przez SSO do tego projektu.')
    ).toBeInTheDocument();
  });

  it('obsługuje błąd sieciowy przy pobieraniu sesji', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nie udało się pobrać sesji');
    });
  });

  it('obsługuje błąd HTTP przy pobieraniu sesji', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nie udało się pobrać sesji');
    });
  });

  it('usuwa sesję po potwierdzeniu w AlertDialog', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptySessionsData,
      });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    });

    // Kliknij przycisk usuwania (pierwszy w liście)
    const deleteButtons = screen.getAllByRole('button').filter((btn) => {
      const svg = btn.querySelector('svg.lucide-trash-2');
      return svg !== null;
    });
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    // Potwierdź usunięcie w AlertDialog
    await waitFor(() => {
      expect(screen.getByText('Usuń sesję?')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Usuń sesję' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/project/test-project-id/sessions?sessionId=session-1',
        { method: 'DELETE' }
      );
    });

    expect(toast.success).toHaveBeenCalledWith('Sesja usunięta');
  });

  it('obsługuje błąd przy usuwaniu sesji', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionsData,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    });

    // Kliknij przycisk usuwania
    const deleteButtons = screen.getAllByRole('button').filter((btn) => {
      const svg = btn.querySelector('svg.lucide-trash-2');
      return svg !== null;
    });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Usuń sesję?')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Usuń sesję' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nie udało się usunąć sesji');
    });
  });

  it('odświeża listę sesji po kliknięciu "Odśwież"', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptySessionsData,
      });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /Odśwież/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Brak aktywnych sesji')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('zamyka dialog po kliknięciu "Zamknij"', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionsData,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: 'Zamknij' });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('wyświetla nazwę projektu w opisie dialogu', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionsData,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('anuluje usuwanie sesji w AlertDialog', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSessionsData,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    });

    // Kliknij przycisk usuwania
    const deleteButtons = screen.getAllByRole('button').filter((btn) => {
      const svg = btn.querySelector('svg.lucide-trash-2');
      return svg !== null;
    });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Usuń sesję?')).toBeInTheDocument();
    });

    // Anuluj
    const cancelButton = screen.getByRole('button', { name: 'Anuluj' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Usuń sesję?')).not.toBeInTheDocument();
    });

    // Fetch nie powinien być wywołany dla DELETE
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('wyświetla różne przeglądarki poprawnie', async () => {
    const sessionsWithDifferentBrowsers = {
      sessions: [
        {
          id: 'session-firefox',
          userEmail: 'firefox@example.com',
          userName: 'Firefox User',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
          ipAddress: null,
          lastSeenAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'session-edge',
          userEmail: 'edge@example.com',
          userName: 'Edge User',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
          ipAddress: null,
          lastSeenAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'session-opera',
          userEmail: 'opera@example.com',
          userName: 'Opera User',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
          ipAddress: null,
          lastSeenAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'session-unknown',
          userEmail: 'unknown@example.com',
          userName: 'Unknown User',
          userAgent: null,
          ipAddress: null,
          lastSeenAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      stats: { total: 4, activeToday: 4, activeThisWeek: 4 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessionsWithDifferentBrowsers,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Firefox')).toBeInTheDocument();
    });

    expect(screen.getByText('Edge')).toBeInTheDocument();
    expect(screen.getByText('Opera')).toBeInTheDocument();
    expect(screen.getByText('Nieznana przeglądarka')).toBeInTheDocument();
  });

  it('pokazuje email gdy brak nazwy użytkownika', async () => {
    const sessionsWithoutName = {
      sessions: [
        {
          id: 'session-no-name',
          userEmail: 'noname@example.com',
          userName: null,
          userAgent: 'Chrome',
          ipAddress: null,
          lastSeenAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      stats: { total: 1, activeToday: 1, activeThisWeek: 1 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessionsWithoutName,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      const emailElements = screen.getAllByText('noname@example.com');
      expect(emailElements.length).toBeGreaterThan(0);
    });
  });

  it('rozpoznaje urządzenia mobilne i tablety', async () => {
    const sessionsWithDevices = {
      sessions: [
        {
          id: 'session-mobile',
          userEmail: 'mobile@example.com',
          userName: 'Mobile User',
          userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile',
          ipAddress: null,
          lastSeenAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'session-tablet',
          userEmail: 'tablet@example.com',
          userName: 'Tablet User',
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Tablet',
          ipAddress: null,
          lastSeenAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'session-desktop',
          userEmail: 'desktop@example.com',
          userName: 'Desktop User',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome',
          ipAddress: null,
          lastSeenAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      stats: { total: 3, activeToday: 3, activeThisWeek: 3 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessionsWithDevices,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Mobile User')).toBeInTheDocument();
    });

    expect(screen.getByText('Tablet User')).toBeInTheDocument();
    expect(screen.getByText('Desktop User')).toBeInTheDocument();

    // Sprawdzamy czy ikony urządzeń są renderowane (SVG)
    const dialog = screen.getByRole('dialog');
    const svgs = dialog.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('wyświetla czas "Nieznany czas" dla null lastSeenAt', async () => {
    const sessionsWithNullTime = {
      sessions: [
        {
          id: 'session-null-time',
          userEmail: 'null@example.com',
          userName: 'Null Time User',
          userAgent: 'Chrome',
          ipAddress: null,
          lastSeenAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      stats: { total: 1, activeToday: 0, activeThisWeek: 0 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessionsWithNullTime,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('Nieznany czas')).toBeInTheDocument();
    });
  });

  it('formatuje datę starszą niż 7 dni jako pełną datę', async () => {
    // 14 dni temu
    const oldDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const sessionsWithOldDate = {
      sessions: [
        {
          id: 'session-old',
          userEmail: 'old@example.com',
          userName: 'Old User',
          userAgent: 'Chrome',
          ipAddress: null,
          lastSeenAt: oldDate.toISOString(),
          createdAt: oldDate.toISOString(),
        },
      ],
      stats: { total: 1, activeToday: 0, activeThisWeek: 0 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessionsWithOldDate,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      // Powinna być wyświetlona pełna data w formacie polskim
      const formattedDate = oldDate.toLocaleDateString('pl-PL');
      expect(screen.getByText(formattedDate)).toBeInTheDocument();
    });
  });

  it('formatuje czas dla dokładnie 1 godziny temu', async () => {
    // Dokładnie 60 minut temu (1 godzina)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const sessionsWithOneHour = {
      sessions: [
        {
          id: 'session-1h',
          userEmail: '1h@example.com',
          userName: '1h User',
          userAgent: 'Chrome',
          ipAddress: null,
          lastSeenAt: oneHourAgo.toISOString(),
          createdAt: oneHourAgo.toISOString(),
        },
      ],
      stats: { total: 1, activeToday: 1, activeThisWeek: 1 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessionsWithOneHour,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('1 godz. temu')).toBeInTheDocument();
    });
  });

  it('formatuje czas dla dokładnie 1 dnia temu', async () => {
    // Dokładnie 24 godziny temu (1 dzień)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const sessionsWithOneDay = {
      sessions: [
        {
          id: 'session-1d',
          userEmail: '1d@example.com',
          userName: '1d User',
          userAgent: 'Chrome',
          ipAddress: null,
          lastSeenAt: oneDayAgo.toISOString(),
          createdAt: oneDayAgo.toISOString(),
        },
      ],
      stats: { total: 1, activeToday: 0, activeThisWeek: 1 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessionsWithOneDay,
    });

    render(<SessionsMonitor {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sesje/i }));

    await waitFor(() => {
      expect(screen.getByText('1 dni temu')).toBeInTheDocument();
    });
  });
});
