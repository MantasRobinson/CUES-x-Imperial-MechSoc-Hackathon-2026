import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterForm from '../../src/components/Auth/RegisterForm';

const mockRegister = vi.fn();
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderForm() {
  return render(
    <MemoryRouter>
      <RegisterForm />
    </MemoryRouter>
  );
}

async function fillAndSubmit({ displayName = 'Alice', email = 'alice@example.com', password = 'Password1!' } = {}) {
  await userEvent.type(screen.getByPlaceholderText('Your name'), displayName);
  await userEvent.type(screen.getByPlaceholderText('you@example.com'), email);
  await userEvent.type(screen.getByPlaceholderText('Min. 8 characters'), password);
  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
}

describe('RegisterForm', () => {
  beforeEach(() => {
    // Reset call history so each test starts with a clean mock
    mockRegister.mockClear();
    mockNavigate.mockClear();
  });
  test('renders all three fields', () => {
    renderForm();
    expect(screen.getByPlaceholderText('Your name')).toBeDefined();
    expect(screen.getByPlaceholderText('you@example.com')).toBeDefined();
    expect(screen.getByPlaceholderText('Min. 8 characters')).toBeDefined();
  });

  test('calls register with correct data on submit', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    renderForm();
    await fillAndSubmit();
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('alice@example.com', 'Password1!', 'Alice');
    });
  });

  test('shows error when password is too short (client-side)', async () => {
    renderForm();
    await fillAndSubmit({ password: 'short' });
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/at least 8 characters/i);
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('shows server error on registration failure', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { error: 'Email already registered.' } },
    });
    renderForm();
    await fillAndSubmit();
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('Email already registered.');
    });
  });

  test('has a link back to sign-in page', () => {
    renderForm();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeDefined();
  });
});
