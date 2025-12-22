import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserIdSection } from './user-id-section'
import { toast } from 'sonner'

// Mock sonner
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
    },
}))

describe('UserIdSection', () => {
    const userId = "user-123-abc"

    beforeEach(() => {
        vi.clearAllMocks()
        // Mock clipboard
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn(),
            },
        })
    })

    it('wyświetla ID użytkownika', () => {
        render(<UserIdSection userId={userId} />)
        expect(screen.getByText(userId)).toBeInTheDocument()
    })

    it('kopiuje ID do schowka po kliknięciu przycisku', async () => {
        render(<UserIdSection userId={userId} />)
        const button = screen.getByRole('button', { name: /Kopiuj ID użytkownika/i })

        await act(async () => {
            fireEvent.click(button)
        })

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(userId)
        expect(toast.success).toHaveBeenCalledWith('Skopiowano ID użytkownika')
    })
})
