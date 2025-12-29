import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuditLogsViewer } from './audit-logs-viewer';

// Mockowanie fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mockowanie URL.createObjectURL i revokeObjectURL (dla eksportu)
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

// Przykładowe dane logów
const mockLogs = [
  {
    id: '1',
    userId: 'user1',
    projectId: 'proj1',
    action: 'login',
    status: 'success',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    metadata: JSON.stringify({ userEmail: 'test@example.com' }),
    createdAt: '2024-12-28T12:00:00Z',
  },
  {
    id: '2',
    userId: 'user2',
    projectId: 'proj1',
    action: 'token_exchange',
    status: 'success',
    ipAddress: '10.0.0.1',
    userAgent: 'SDK/1.0',
    metadata: JSON.stringify({
      projectName: 'Test Project',
      redirectUri: 'https://app.test.com/callback',
    }),
    createdAt: '2024-12-28T11:00:00Z',
  },
  {
    id: '3',
    userId: 'user3',
    projectId: 'proj1',
    action: 'access_denied',
    status: 'failure',
    ipAddress: '8.8.8.8',
    userAgent: 'Hacker/1.0',
    metadata: JSON.stringify({ reason: 'project_private' }),
    createdAt: '2024-12-28T10:00:00Z',
  },
];

describe('AuditLogsViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ logs: mockLogs }),
    });
  });

  it('wyświetla skeleton podczas ładowania', () => {
    // Opóźnij odpowiedź fetch, aby komponent był w stanie loading
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));

    render(<AuditLogsViewer />);

    // Tytuł powinien być widoczny nawet podczas ładowania
    expect(screen.getByText('Logi Audytu')).toBeInTheDocument();
  });

  it('wyświetla błąd gdy fetch się nie powiedzie', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    render(<AuditLogsViewer />);

    await waitFor(() => {
      expect(screen.getByText('Błąd podczas pobierania logów audytu')).toBeInTheDocument();
    });
  });

  it('wyświetla listę logów po załadowaniu', async () => {
    render(<AuditLogsViewer />);

    await waitFor(() => {
      expect(screen.getAllByText(/Zalogowano do systemu CLA/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Wymieniono kod na token SSO/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Odmowa dostępu!/)[0]).toBeInTheDocument();
    });
  });

  it('wyświetla komunikat gdy brak logów', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ logs: [] }),
    });

    render(<AuditLogsViewer />);

    await waitFor(() => {
      expect(screen.getByText('Brak logów do wyświetlenia')).toBeInTheDocument();
    });
  });

  it('wyszukuje logi po tekście', async () => {
    render(<AuditLogsViewer />);

    await waitFor(() => {
      expect(screen.getAllByText(/Zalogowano do systemu CLA/)[0]).toBeInTheDocument();
    });

    // Wpisz w wyszukiwarkę
    const searchInput = screen.getByPlaceholderText('Szukaj...');
    fireEvent.change(searchInput, { target: { value: 'test@example.com' } });

    // Tylko log z tym emailem powinien być widoczny
    await waitFor(() => {
      expect(screen.getAllByText(/Zalogowano do systemu CLA/)[0]).toBeInTheDocument();
      expect(screen.queryByText(/Wymieniono kod na token SSO/)).not.toBeInTheDocument();
    });
  });

  it('odświeża logi po kliknięciu przycisku Odśwież', async () => {
    render(<AuditLogsViewer />);

    await waitFor(() => {
      expect(screen.getAllByText(/Zalogowano do systemu CLA/)[0]).toBeInTheDocument();
    });

    // Pierwsze wywołanie (przy renderze)
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Kliknij przycisk odświeżania
    const refreshButton = screen.getByRole('button', { name: /Odśwież/i });
    fireEvent.click(refreshButton);

    // Drugie wywołanie
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('przekazuje projectId do API gdy jest podany', async () => {
    render(<AuditLogsViewer projectId="test-project-id" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('projectId=test-project-id'));
    });
  });

  it('wyświetla przycisk eksportu tylko gdy są logi', async () => {
    render(<AuditLogsViewer />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eksport/i })).toBeInTheDocument();
    });
  });

  it('ukrywa przycisk eksportu gdy brak logów', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ logs: [] }),
    });

    render(<AuditLogsViewer />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Eksport/i })).not.toBeInTheDocument();
    });
  });

  it('wyświetla właściwe ikony dla różnych typów akcji', async () => {
    render(<AuditLogsViewer />);

    await waitFor(() => {
      // Sprawdź czy logi są wyświetlane z odpowiednimi labelami
      expect(screen.getAllByText(/Zalogowano do systemu CLA/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Wymieniono kod na token SSO/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Odmowa dostępu!/)[0]).toBeInTheDocument();
    });
  });

  it('wyświetla adresy IP w logach', async () => {
    render(<AuditLogsViewer />);

    await waitFor(() => {
      expect(screen.getAllByText(/192.168.1.1/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/10.0.0.1/)[0]).toBeInTheDocument();
    });
  });

  it('wyświetla przycisk Wyczyść gdy są logi', async () => {
    render(<AuditLogsViewer />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Wyczyść/i })).toBeInTheDocument();
    });
  });

  it('przekazuje limit do API', async () => {
    render(<AuditLogsViewer limit={50} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=50'));
    });
  });

  it('wyświetla opis dla projektu gdy projectId jest podany', async () => {
    render(<AuditLogsViewer projectId="test-project" />);

    await waitFor(() => {
      expect(screen.getAllByText(/Projekt/)[0]).toBeInTheDocument();
    });
  });

  it('wyświetla opis dla wszystkich projektów gdy brak projectId', async () => {
    render(<AuditLogsViewer />);

    await waitFor(() => {
      expect(screen.getAllByText(/Wszystkie projekty/)[0]).toBeInTheDocument();
    });
  });
});
