import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionTable from '../../src/components/Dashboard/SessionTable';

const SESSIONS = [
  {
    id: '1',
    startTime: '2026-03-14T10:00:00Z',
    endTime:   '2026-03-14T10:20:00Z',
    durationMinutes: 20,
    disturbanceCount: 0,
    noiseLevel: 'Quiet',
    xpEarned: 250,
  },
  {
    id: '2',
    startTime: '2026-03-13T14:00:00Z',
    endTime:   '2026-03-13T15:05:00Z',
    durationMinutes: 65,
    disturbanceCount: 2,
    noiseLevel: 'Loud',
    xpEarned: 1300,
  },
  {
    id: '3',
    startTime: '2026-03-12T09:00:00Z',
    endTime:   '2026-03-12T09:30:00Z',
    durationMinutes: 30,
    disturbanceCount: 1,
    noiseLevel: 'Moderate',
    xpEarned: 300,
  },
];

describe('SessionTable', () => {
  test('renders a row per session', () => {
    render(<SessionTable sessions={SESSIONS} />);
    // Each session shows its XP
    expect(screen.getByText('+250')).toBeDefined();
    expect(screen.getByText('+1300')).toBeDefined();
    expect(screen.getByText('+300')).toBeDefined();
  });

  test('shows empty state when no sessions', () => {
    render(<SessionTable sessions={[]} />);
    expect(screen.getByText(/No sessions yet/i)).toBeDefined();
  });

  test('shows empty state when sessions is undefined', () => {
    render(<SessionTable />);
    expect(screen.getByText(/No sessions yet/i)).toBeDefined();
  });

  test('filter hides non-matching rows', async () => {
    render(<SessionTable sessions={SESSIONS} />);
    const filterInput = screen.getByPlaceholderText('Filter…');
    await userEvent.type(filterInput, 'Quiet');
    // Only the Quiet session XP should still be visible
    expect(screen.getByText('+250')).toBeDefined();
    expect(screen.queryByText('+1300')).toBeNull();
  });

  test('clicking Duration header sorts by durationMinutes', async () => {
    render(<SessionTable sessions={SESSIONS} />);
    const durationHeader = screen.getByText(/Duration/i);
    await userEvent.click(durationHeader);
    // After one click (desc), longest session (65m → 1h 5m) should be first
    const rows = screen.getAllByRole('row');
    // rows[0] = header, rows[1] = first data row
    expect(rows[1].textContent).toContain('1h 5m');
  });
});
