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

  it('kopiuje ID do schowka i pokazuje ikonę Check', async () => {
    const { container } = render(<UserIdSection userId={userId} />);
    const button = screen.getByRole('button', { name: /Kopiuj ID użytkownika/i });

    // Przed kliknięciem - ikona Copy (bez scale-110)
    let icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon?.classList.contains('scale-110')).toBe(false);

    await act(async () => {
      fireEvent.click(button);
    });

    // Po kliknięciu - ikona Check (ze scale-110)
    icon = button.querySelector('svg');
    expect(icon?.classList.contains('scale-110')).toBe(true);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(userId);
    expect(toast.success).toHaveBeenCalledWith('Skopiowano ID użytkownika');
  });

  it('ikona wraca do Copy po 2 sekundach', async () => {
    vi.useFakeTimers();

    render(<UserIdSection userId={userId} />);
    const button = screen.getByRole('button', { name: /Kopiuj ID użytkownika/i });

    // Przed kliknięciem - ikona Copy
    let icon = button.querySelector('svg');
    expect(icon?.classList.contains('scale-110')).toBe(false);

    // Kliknij przycisk - powinien pokazać ikonę Check
    await act(async () => {
      fireEvent.click(button);
    });

    // Po kliknięciu - ikona Check (ze scale-110)
    icon = button.querySelector('svg');
    expect(icon?.classList.contains('scale-110')).toBe(true);

    // Przewiń czas o 2 sekundy
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Ikona powinna wrócić do Copy (bez scale-110)
    icon = button.querySelector('svg');
    expect(icon?.classList.contains('scale-110')).toBe(false);

    vi.useRealTimers();
  });
});
