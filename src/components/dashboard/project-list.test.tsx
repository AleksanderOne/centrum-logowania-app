import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectList } from './project-list';
import { deleteProject } from '@/actions/project';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Mocks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/actions/project', () => ({
  deleteProject: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock clipboard for CopyButtons inside ProjectList
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('ProjectList', () => {
  const mockProjects = [
    {
      id: '1',
      name: 'Projekt A',
      slug: 'projekt-a-xyz',
      domain: 'example.com',
      apiKey: 'cl_abc123',
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Projekt B',
      slug: 'projekt-b-uvw',
      domain: null,
      apiKey: 'cl_def456',
      createdAt: new Date(),
    },
  ];

  const mockRouter = {
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
  });

  it('wyświetla informację o braku projektów gdy lista jest pusta (brak projektów w ogóle)', () => {
    render(<ProjectList projects={[]} totalCount={0} />);
    expect(screen.getByText(/Nie masz jeszcze żadnych projektów/i)).toBeInTheDocument();
  });

  it('wyświetla informację o braku wyników wyszukiwania gdy totalCount > 0 ale projects jest puste', () => {
    render(<ProjectList projects={[]} totalCount={5} />);
    expect(
      screen.getByText(/Nie znaleziono projektów pasujących do wyszukiwania/i)
    ).toBeInTheDocument();
  });

  it('wyświetla listę projektów', () => {
    render(<ProjectList projects={mockProjects} totalCount={2} />);
    expect(screen.getByText('Projekt A')).toBeInTheDocument();
    expect(screen.getByText('Projekt B')).toBeInTheDocument();
  });

  it('otwiera modal potwierdzenia usunięcia po kliknięciu kosza', async () => {
    render(<ProjectList projects={[mockProjects[0]]} totalCount={1} />);

    // Kliknij przycisk usuwania (kosz)
    const deleteButton = screen.getByRole('button', { name: /Usuń projekt/i });
    fireEvent.click(deleteButton);

    // Sprawdź czy modal się otworzył
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Czy jesteś pewny/i)).toBeInTheDocument();
  });

  it('wywołuje deleteProject po potwierdzeniu w modalu', async () => {
    vi.mocked(deleteProject).mockResolvedValue({ success: 'Projekt usunięty' });

    render(<ProjectList projects={[mockProjects[0]]} totalCount={1} />);

    // Otwórz modal
    const deleteButton = screen.getByRole('button', { name: /Usuń projekt/i });
    fireEvent.click(deleteButton);

    // Potwierdź usunięcie
    const confirmButton = screen.getByRole('button', { name: 'Usuń' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteProject).toHaveBeenCalledWith('1');
    });

    expect(toast.success).toHaveBeenCalledWith('Projekt usunięty');
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('nie usuwa projektu po anulowaniu w modalu', async () => {
    render(<ProjectList projects={[mockProjects[0]]} totalCount={1} />);

    // Otwórz modal
    const deleteButton = screen.getByRole('button', { name: /Usuń projekt/i });
    fireEvent.click(deleteButton);

    // Anuluj
    const cancelButton = screen.getByRole('button', { name: 'Anuluj' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    expect(deleteProject).not.toHaveBeenCalled();
  });

  it('wyświetla błąd gdy usunięcie projektu się nie powiedzie', async () => {
    vi.mocked(deleteProject).mockResolvedValue({ error: 'Nie udało się usunąć projektu' });

    render(<ProjectList projects={[mockProjects[0]]} totalCount={1} />);

    // Otwórz modal i potwierdź usunięcie
    const deleteButton = screen.getByRole('button', { name: /Usuń projekt/i });
    fireEvent.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: 'Usuń' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteProject).toHaveBeenCalledWith('1');
    });

    expect(toast.error).toHaveBeenCalledWith('Nie udało się usunąć projektu');
    expect(mockRouter.refresh).not.toHaveBeenCalled();
  });

  it('kopiuje Client ID do schowka i pokazuje ikonę Check', async () => {
    vi.useFakeTimers();

    render(<ProjectList projects={[mockProjects[0]]} totalCount={1} />);

    // Znajdź przycisk kopiowania Client ID
    const copyButton = screen.getAllByRole('button', { name: /Kopiuj Client ID/i })[0];

    // Przed kliknięciem - ikona Copy (bez text-green-500)
    let icon = copyButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon?.classList.contains('text-green-500')).toBe(false);

    await act(async () => {
      fireEvent.click(copyButton);
    });

    // Po kliknięciu - ikona Check (z text-green-500)
    icon = copyButton.querySelector('svg');
    expect(icon?.classList.contains('text-green-500')).toBe(true);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('projekt-a-xyz');
    expect(toast.success).toHaveBeenCalledWith('Skopiowano Client ID');

    // Sprawdź że ikona wraca po 2 sekundach
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Ikona powinna wrócić do Copy (bez text-green-500)
    icon = copyButton.querySelector('svg');
    expect(icon?.classList.contains('text-green-500')).toBe(false);

    vi.useRealTimers();
  });

  it('kopiuje API Key do schowka i pokazuje ikonę Check', async () => {
    render(<ProjectList projects={[mockProjects[0]]} totalCount={1} />);

    // Znajdź przycisk kopiowania API Key
    const copyButton = screen.getAllByRole('button', { name: /Kopiuj API Key/i })[0];

    // Przed kliknięciem - ikona Copy
    let icon = copyButton.querySelector('svg');
    expect(icon?.classList.contains('text-green-500')).toBe(false);

    await act(async () => {
      fireEvent.click(copyButton);
    });

    // Po kliknięciu - ikona Check (z text-green-500)
    icon = copyButton.querySelector('svg');
    expect(icon?.classList.contains('text-green-500')).toBe(true);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('cl_abc123');
    expect(toast.success).toHaveBeenCalledWith('Skopiowano API Key');
  });

  it('wyświetla "Brak domeny" gdy projekt nie ma domeny', () => {
    render(<ProjectList projects={[mockProjects[1]]} totalCount={1} />);
    expect(screen.getByText('Brak domeny')).toBeInTheDocument();
  });
});
