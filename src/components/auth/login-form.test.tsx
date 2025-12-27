import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from './login-form';
import { signIn } from 'next-auth/react';

// Mockowanie next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

// Mock dla useSearchParams
const mockGet = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null); // Domyślnie brak parametru
  });

  it('wyświetla przycisk logowania Google', () => {
    render(<LoginForm />);
    const button = screen.getByText(/Kontynuuj z Google/i);
    expect(button).toBeInTheDocument();
  });

  it('wywołuje signIn z domyślnym callbackiem /dashboard', async () => {
    render(<LoginForm />);
    const button = screen.getByText(/Kontynuuj z Google/i);

    fireEvent.click(button);

    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });
  });

  it('obsługuje relatywny callbackUrl z parametrów', async () => {
    mockGet.mockReturnValue('/custom-path');
    render(<LoginForm />);
    const button = screen.getByText(/Kontynuuj z Google/i);

    fireEvent.click(button);

    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/custom-path' });
  });

  it('konwertuje absolutny URL na relatywny', async () => {
    mockGet.mockReturnValue('https://example.com/foo?bar=baz');
    render(<LoginForm />);
    const button = screen.getByText(/Kontynuuj z Google/i);

    fireEvent.click(button);

    // Oczekujemy, że URL zostanie przycięty do ścieżki i query stringa
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/foo?bar=baz' });
  });

  it('zachowuje oryginalny URL w przypadku błędu parsowania (catch block coverage)', async () => {
    // Podajemy coś, co zaczyna się od http, ale jest błędnym URL-em (np. zawiera spację w domenie)
    // Uwaga: Konstruktor URL jest dość tolerancyjny, ale spacja w host w "http:// exmaple" powinna rzucić błąd
    const invalidUrl = 'http:// exam ple . com';
    mockGet.mockReturnValue(invalidUrl);

    render(<LoginForm />);
    const button = screen.getByText(/Kontynuuj z Google/i);

    fireEvent.click(button);

    // Oczekujemy, że fallback zadziała i przekaże oryginalny string
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: invalidUrl });
  });

  it('zmienia stan na loading po kliknięciu', async () => {
    render(<LoginForm />);
    const button = screen.getByRole('button', { name: /Kontynuuj z Google/i });

    fireEvent.click(button);

    // Sprawdzamy czy przycisk jest disabled i czy pokazuje się spinner (class animate-spin)
    expect(button).toBeDisabled();
    const spinner = screen.getByRole('button').querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
