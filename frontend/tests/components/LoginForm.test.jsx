import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from '../../src/components/Auth/LoginForm';

// Mock useAuth
const mockLogin = vi.fn();
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>
  );
}

describe('LoginForm', () => {
  test('renders email and password fields', () => {
    renderForm();
    expect(screen.getByPlaceholderText('you@example.com')).toBeDefined();
    expect(screen.getByPlaceholderText('••••••••')).toBeDefined();
  });

  test('renders sign-in button', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });

  test('calls login with typed credentials on submit', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    renderForm();

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'alice@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password1!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('alice@example.com', 'Password1!');
    });
  });

  test('shows error message on failed login', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials.' } },
    });
    renderForm();

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'alice@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Invalid credentials.');
    });
  });

  test('disables button while submitting', async () => {
    // login never resolves during this test
    mockLogin.mockReturnValueOnce(new Promise(() => {}));
    renderForm();

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'alice@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password1!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i }).disabled).toBe(true);
    });
  });

  test('has a link to register page', () => {
    renderForm();
    expect(screen.getByRole('link', { name: /register/i })).toBeDefined();
  });
});
