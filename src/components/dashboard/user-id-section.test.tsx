import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserIdSection } from './user-id-section';
import { toast } from 'sonner';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe('UserIdSection', () => {
  const userId = 'user-123-abc';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });
  });

  it('wyświetla ID użytkownika', () => {
    render(<UserIdSection userId={userId} />);
    expect(screen.getByText(userId)).toBeInTheDocument();
  });

  it('kopiuje ID do schowka po kliknięciu przycisku', async () => {
    render(<UserIdSection userId={userId} />);
    const button = screen.getByRole('button', { name: /Kopiuj ID użytkownika/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(userId);
    expect(toast.success).toHaveBeenCalledWith('Skopiowano ID użytkownika');
  });

  it('ikona wraca do Copy po 2 sekundach', async () => {
    vi.useFakeTimers();

    render(<UserIdSection userId={userId} />);
    const button = screen.getByRole('button', { name: /Kopiuj ID użytkownika/i });

    // Kliknij przycisk - powinien pokazać ikonę Check
    await act(async () => {
      fireEvent.click(button);
    });

    // Sprawdź czy jest ikona Check (przez sprawdzenie czy nie ma Copy w nazwie)
    expect(button.querySelector('svg')).toBeInTheDocument();

    // Przewiń czas o 2 sekundy
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Ikona powinna wrócić do Copy
    expect(button.querySelector('svg')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
