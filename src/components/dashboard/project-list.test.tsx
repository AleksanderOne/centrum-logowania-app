import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

  it('wyświetla informację o braku projektów gdy lista jest pusta', () => {
    render(<ProjectList projects={[]} />);
    expect(screen.getByText(/Nie masz jeszcze żadnych projektów/i)).toBeInTheDocument();
  });

  it('wyświetla listę projektów', () => {
    render(<ProjectList projects={mockProjects} />);
    expect(screen.getByText('Projekt A')).toBeInTheDocument();
    expect(screen.getByText('Projekt B')).toBeInTheDocument();
  });

  it('filtruje projekty po nazwie', () => {
    render(<ProjectList projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'Projekt A' } });

    expect(screen.getByText('Projekt A')).toBeInTheDocument();
    expect(screen.queryByText('Projekt B')).not.toBeInTheDocument();
  });

  it('filtruje projekty po Client ID (slug)', () => {
    render(<ProjectList projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'projekt-b-uvw' } });

    expect(screen.queryByText('Projekt A')).not.toBeInTheDocument();
    expect(screen.getByText('Projekt B')).toBeInTheDocument();
  });

  it('pokazuje komunikat o braku wyników wyszukiwania', () => {
    render(<ProjectList projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'nieistniejący' } });

    expect(
      screen.getByText(/Nie znaleziono projektów pasujących do wyszukiwania/i)
    ).toBeInTheDocument();
  });

  it('otwiera modal potwierdzenia usunięcia po kliknięciu kosza', async () => {
    render(<ProjectList projects={[mockProjects[0]]} />);

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

    render(<ProjectList projects={[mockProjects[0]]} />);

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
    render(<ProjectList projects={[mockProjects[0]]} />);

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

    render(<ProjectList projects={[mockProjects[0]]} />);

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

  it('kopiuje Client ID do schowka po kliknięciu przycisku kopiowania', async () => {
    vi.useFakeTimers();

    render(<ProjectList projects={[mockProjects[0]]} />);

    // Znajdź przycisk kopiowania Client ID
    const copyButtons = screen.getAllByRole('button', { name: /Kopiuj Client ID/i });
    fireEvent.click(copyButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('projekt-a-xyz');
    expect(toast.success).toHaveBeenCalledWith('Skopiowano Client ID');

    // Sprawdź że ikona wraca po 2 sekundach
    await vi.advanceTimersByTimeAsync(2000);

    vi.useRealTimers();
  });

  it('kopiuje API Key do schowka po kliknięciu przycisku kopiowania', async () => {
    render(<ProjectList projects={[mockProjects[0]]} />);

    // Znajdź przycisk kopiowania API Key
    const copyButtons = screen.getAllByRole('button', { name: /Kopiuj API Key/i });
    fireEvent.click(copyButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('cl_abc123');
    expect(toast.success).toHaveBeenCalledWith('Skopiowano API Key');
  });

  it('filtruje projekty po domenie', () => {
    render(<ProjectList projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'example.com' } });

    expect(screen.getByText('Projekt A')).toBeInTheDocument();
    expect(screen.queryByText('Projekt B')).not.toBeInTheDocument();
  });

  it('filtruje projekty po API Key', () => {
    render(<ProjectList projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'cl_def456' } });

    expect(screen.queryByText('Projekt A')).not.toBeInTheDocument();
    expect(screen.getByText('Projekt B')).toBeInTheDocument();
  });

  it('wyświetla "Brak domeny" gdy projekt nie ma domeny', () => {
    render(<ProjectList projects={[mockProjects[1]]} />);
    expect(screen.getByText('Brak domeny')).toBeInTheDocument();
  });
});
