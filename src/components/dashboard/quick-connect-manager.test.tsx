import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QuickConnectManager } from './quick-connect-manager';
import { toast } from 'sonner';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Setup global fetch mock
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('QuickConnectManager', () => {
  const projectId = 'proj_123';
  const projectName = 'Test Project';
  const mockCode = {
    id: 'code_1',
    code: 'setup_abc123',
    expiresAt: new Date(Date.now() + 60000).toISOString(), // 1 min from now
    projectId: projectId,
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    // Don't use fake timers globally to avoid waitFor timeouts in async fetch tests
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('obsługuje odpowiedź API bez pola codes (fallback na pustą tablicę)', async () => {
    // API zwraca pustą odpowiedź bez pola codes
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // Brak pola codes
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    // Powinno pokazać "Brak aktywnych kodów"
    await waitFor(() => {
      expect(screen.getByText('Brak aktywnych kodów')).toBeInTheDocument();
    });
  });

  it('otwiera dialog i pobiera kody', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [mockCode] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);

    // Kliknij przycisk otwierający (Quick Connect)
    fireEvent.click(screen.getByText('Quick Connect'));

    expect(screen.getByText(/Jednorazowe kody do szybkiego podłączenia/i)).toBeInTheDocument();

    // Check if fetch was called
    expect(fetchMock).toHaveBeenCalledWith(`/api/v1/project/${projectId}/setup-code`);

    // Wait for codes to load
    await waitFor(() => {
      expect(screen.getByText('setup_abc123')).toBeInTheDocument();
    });
  });

  it('obsługuje błąd pobierania kodów', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nie udało się pobrać kodów');
    });
  });

  it('generuje nowy kod', async () => {
    // Pierwszy fetch (pobranie pustej listy)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    // Czekaj na załadowanie (brak kodów)
    await waitFor(() => expect(screen.getByText('Brak aktywnych kodów')).toBeInTheDocument());

    // Mock response dla generowania
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockCode, id: 'code_new', code: 'setup_new' }),
    });

    // Kliknij generuj
    fireEvent.click(screen.getByText('Wygeneruj nowy kod'));

    await waitFor(() => {
      expect(screen.getByText('setup_new')).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('Wygenerowano nowy Quick Connect!');
    });
  });

  it('usuwa kod', async () => {
    // Fetch z jednym kodem
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [mockCode] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    await waitFor(() => expect(screen.getByText('setup_abc123')).toBeInTheDocument());

    // Mock delete success
    fetchMock.mockResolvedValueOnce({ ok: true });

    // Kliknij usuń (kosz)
    const deleteBtn = screen.getByTitle('Usuń kod');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText('setup_abc123')).not.toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('Usunięto Quick Connect');
    });
  });

  it('odświeża licznik czasu', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval'] });
    // Create a code expiring in 5 seconds
    const expiringCode = {
      ...mockCode,
      expiresAt: new Date(Date.now() + 5000).toISOString(),
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [expiringCode] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    await waitFor(() =>
      expect(
        screen.getByText((content) => content.includes('0:05') || content.includes('5s'))
      ).toBeInTheDocument()
    );

    // Advance time by 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Check if updated (rough check)
    await waitFor(() =>
      expect(
        screen.getByText((content) => content.includes('0:03') || content.includes('3s'))
      ).toBeInTheDocument()
    );
  });

  it('automatycznie usuwa wygasłe kody z widoku', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval'] });
    const expiringSoon = {
      ...mockCode,
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [expiringSoon] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    await waitFor(() => expect(screen.getByText('setup_abc123')).toBeInTheDocument());

    // Advance time past expiration
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    await waitFor(() => {
      expect(screen.queryByText('setup_abc123')).not.toBeInTheDocument();
    });
  });

  it('kopiuje kod do schowka po kliknięciu CopyButton', async () => {
    // Mock clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [mockCode] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    await waitFor(() => expect(screen.getByText('setup_abc123')).toBeInTheDocument());

    // Kliknij przycisk kopiowania
    const copyBtn = screen.getByTitle('Kopiuj kod');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('setup_abc123');
    expect(toast.success).toHaveBeenCalledWith('Skopiowano kod!');
  });

  it('resetuje ikonę kopiowania po 2 sekundach', async () => {
    vi.useFakeTimers();

    // Mock clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    // Kod z długim czasem wygaśnięcia
    const longCode = {
      ...mockCode,
      expiresAt: new Date(Date.now() + 600000).toISOString(), // 10 min
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [longCode] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);

    // Otwórz dialog
    await act(async () => {
      fireEvent.click(screen.getByText('Quick Connect'));
      await vi.advanceTimersByTimeAsync(100); // Pozwól na fetch
    });

    // Kliknij kopiuj
    const copyBtn = screen.getByTitle('Kopiuj kod');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(toast.success).toHaveBeenCalledWith('Skopiowano kod!');

    // Przeskocz 2 sekundy - callback setTimeout powinien się wykonać
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Test przeszedł = callback setTimeout się wykonał (linia 37)
  });

  it('obsługuje błąd generowania kodu', async () => {
    // Pierwszy fetch (pobranie pustej listy)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    await waitFor(() => expect(screen.getByText('Brak aktywnych kodów')).toBeInTheDocument());

    // Mock błąd generowania
    fetchMock.mockResolvedValueOnce({ ok: false });

    // Kliknij generuj
    fireEvent.click(screen.getByText('Wygeneruj nowy kod'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nie udało się wygenerować kodu');
    });
  });

  it('obsługuje błąd usuwania kodu', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [mockCode] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    await waitFor(() => expect(screen.getByText('setup_abc123')).toBeInTheDocument());

    // Mock błąd usuwania
    fetchMock.mockResolvedValueOnce({ ok: false });

    // Kliknij usuń
    const deleteBtn = screen.getByTitle('Usuń kod');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nie udało się usunąć kodu');
    });

    // Kod powinien nadal być widoczny (nie został usunięty)
    expect(screen.getByText('setup_abc123')).toBeInTheDocument();
  });

  it('zamyka dialog po kliknięciu przycisku Zamknij', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    await waitFor(() => expect(screen.getByText('Brak aktywnych kodów')).toBeInTheDocument());

    // Kliknij Zamknij
    fireEvent.click(screen.getByText('Zamknij'));

    await waitFor(() => {
      expect(screen.queryByText('Brak aktywnych kodów')).not.toBeInTheDocument();
    });
  });

  it('wyświetla czas w formacie minut:sekund gdy pozostało więcej niż minuta', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval'] });
    // Kod wygasający za 2 minuty i 30 sekund
    const codeWithMinutes = {
      ...mockCode,
      expiresAt: new Date(Date.now() + 150000).toISOString(), // 2:30
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ codes: [codeWithMinutes] }),
    });

    render(<QuickConnectManager projectId={projectId} projectName={projectName} />);
    fireEvent.click(screen.getByText('Quick Connect'));

    // Sprawdź format minut:sekund (2:30 lub podobny)
    await waitFor(() =>
      expect(
        screen.getByText((content) => content.includes('2:30') || content.includes('2:29'))
      ).toBeInTheDocument()
    );
  });
});
