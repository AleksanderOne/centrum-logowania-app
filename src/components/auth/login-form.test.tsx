import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginForm } from './login-form';
import { signIn } from 'next-auth/react';

// Mockowanie next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

// Mockowanie next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

describe('LoginForm', () => {
  it('wyświetla przycisk logowania Google', () => {
    render(<LoginForm />);
    const button = screen.getByText(/Kontynuuj z Google/i);
    expect(button).toBeInTheDocument();
  });

  it('wywołuje signIn po kliknięciu', async () => {
    render(<LoginForm />);
    const button = screen.getByText(/Kontynuuj z Google/i);

    fireEvent.click(button);

    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });
  });

  it('zmienia stan na loading po kliknięciu', async () => {
    render(<LoginForm />);
    const button = screen.getByRole('button', { name: /Kontynuuj z Google/i });

    fireEvent.click(button);

    // Sprawdzamy czy przycisk jest disabled i czy pokazuje się spinner (class animate-spin)
    expect(button).toBeDisabled();
    // Możemy poszukać elementu z klasą animate-spin
    // Uwaga: querySelector w testach jednostkowych react-testing-library działa na container
    const spinner = screen.getByRole('button').querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
