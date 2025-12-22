import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProjectList } from './project-list'
import { deleteProject } from '@/actions/project'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Mocks
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}))

vi.mock('@/actions/project', () => ({
    deleteProject: vi.fn(),
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

// Mock clipboard for CopyButtons inside ProjectList
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn(),
    },
})

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
        }
    ]

    const mockRouter = {
        refresh: vi.fn(),
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useRouter).mockReturnValue(mockRouter as any)
    })

    it('wyświetla informację o braku projektów gdy lista jest pusta', () => {
        render(<ProjectList projects={[]} />)
        expect(screen.getByText(/Nie masz jeszcze żadnych projektów/i)).toBeInTheDocument()
    })

    it('wyświetla listę projektów', () => {
        render(<ProjectList projects={mockProjects} />)
        expect(screen.getByText('Projekt A')).toBeInTheDocument()
        expect(screen.getByText('Projekt B')).toBeInTheDocument()
    })

    it('filtruje projekty po nazwie', () => {
        render(<ProjectList projects={mockProjects} />)
        const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i)

        fireEvent.change(searchInput, { target: { value: 'Projekt A' } })

        expect(screen.getByText('Projekt A')).toBeInTheDocument()
        expect(screen.queryByText('Projekt B')).not.toBeInTheDocument()
    })

    it('filtruje projekty po Client ID (slug)', () => {
        render(<ProjectList projects={mockProjects} />)
        const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i)

        fireEvent.change(searchInput, { target: { value: 'projekt-b-uvw' } })

        expect(screen.queryByText('Projekt A')).not.toBeInTheDocument()
        expect(screen.getByText('Projekt B')).toBeInTheDocument()
    })

    it('pokazuje komunikat o braku wyników wyszukiwania', () => {
        render(<ProjectList projects={mockProjects} />)
        const searchInput = screen.getByPlaceholderText(/Szukaj po nazwie/i)

        fireEvent.change(searchInput, { target: { value: 'nieistniejący' } })

        expect(screen.getByText(/Nie znaleziono projektów pasujących do wyszukiwania/i)).toBeInTheDocument()
    })

    it('otwiera modal potwierdzenia usunięcia po kliknięciu kosza', async () => {
        render(<ProjectList projects={[mockProjects[0]]} />)

        // Kliknij przycisk usuwania (kosz)
        const deleteButton = screen.getByRole('button', { name: /Usuń projekt/i })
        fireEvent.click(deleteButton)

        // Sprawdź czy modal się otworzył
        const dialog = screen.getByRole('alertdialog')
        expect(dialog).toBeInTheDocument()
        expect(within(dialog).getByText(/Czy jesteś pewny/i)).toBeInTheDocument()
    })

    it('wywołuje deleteProject po potwierdzeniu w modalu', async () => {
        vi.mocked(deleteProject).mockResolvedValue({ success: 'Projekt usunięty' })

        render(<ProjectList projects={[mockProjects[0]]} />)

        // Otwórz modal
        const deleteButton = screen.getByRole('button', { name: /Usuń projekt/i })
        fireEvent.click(deleteButton)

        // Potwierdź usunięcie
        const confirmButton = screen.getByRole('button', { name: 'Usuń' })
        fireEvent.click(confirmButton)

        await waitFor(() => {
            expect(deleteProject).toHaveBeenCalledWith('1')
        })

        expect(toast.success).toHaveBeenCalledWith('Projekt usunięty')
        expect(mockRouter.refresh).toHaveBeenCalled()
    })

    it('nie usuwa projektu po anulowaniu w modalu', async () => {
        render(<ProjectList projects={[mockProjects[0]]} />)

        // Otwórz modal
        const deleteButton = screen.getByRole('button', { name: /Usuń projekt/i })
        fireEvent.click(deleteButton)

        // Anuluj
        const cancelButton = screen.getByRole('button', { name: 'Anuluj' })
        fireEvent.click(cancelButton)

        await waitFor(() => {
            expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
        })

        expect(deleteProject).not.toHaveBeenCalled()
    })
})
