import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectsContainer } from './projects-container';
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

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('ProjectsContainer', () => {
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
      domain: 'test.pl',
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

  it('nie wyświetla wyszukiwarki gdy brak projektów', () => {
    render(<ProjectsContainer projects={[]} />);
    expect(screen.queryByPlaceholderText(/Szukaj po nazwie/i)).not.toBeInTheDocument();
  });

  it('wyświetla wyszukiwarkę gdy są projekty', () => {
    render(<ProjectsContainer projects={mockProjects} />);
    expect(screen.getByPlaceholderText(/Szukaj po nazwie/i)).toBeInTheDocument();
  });

  it('filtruje projekty po nazwie', () => {
    render(<ProjectsContainer projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'Projekt A' } });

    expect(screen.getByText('Projekt A')).toBeInTheDocument();
    expect(screen.queryByText('Projekt B')).not.toBeInTheDocument();
  });

  it('filtruje projekty po Client ID (slug)', () => {
    render(<ProjectsContainer projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'projekt-b-uvw' } });

    expect(screen.queryByText('Projekt A')).not.toBeInTheDocument();
    expect(screen.getByText('Projekt B')).toBeInTheDocument();
  });

  it('filtruje projekty po domenie', () => {
    render(<ProjectsContainer projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'example.com' } });

    expect(screen.getByText('Projekt A')).toBeInTheDocument();
    expect(screen.queryByText('Projekt B')).not.toBeInTheDocument();
  });

  it('filtruje projekty po API Key', () => {
    render(<ProjectsContainer projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'cl_def456' } });

    expect(screen.queryByText('Projekt A')).not.toBeInTheDocument();
    expect(screen.getByText('Projekt B')).toBeInTheDocument();
  });

  it('pokazuje komunikat o braku wyników wyszukiwania', () => {
    render(<ProjectsContainer projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'nieistniejący' } });

    expect(
      screen.getByText(/Nie znaleziono projektów pasujących do wyszukiwania/i)
    ).toBeInTheDocument();
  });

  it('filtruje case-insensitive', () => {
    render(<ProjectsContainer projects={mockProjects} />);
    const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i);

    fireEvent.change(searchInput, { target: { value: 'projekt a' } });

    expect(screen.getByText('Projekt A')).toBeInTheDocument();
  });
});
