import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeaderboardTable from '../../src/components/Leaderboard/LeaderboardTable';

const ROWS = [
  { rank: 1, user: { id: 'u1', displayName: 'Alice', level: 5 }, value: '1200 XP' },
  { rank: 2, user: { id: 'u2', displayName: 'Bob',   level: 3 }, value: '800 XP' },
  { rank: 3, user: { id: 'u3', displayName: 'Carol', level: 7 }, value: '600 XP' },
];

describe('LeaderboardTable', () => {
  test('renders all player rows', () => {
    render(<LeaderboardTable rows={ROWS} valueLabel="Weekly XP" />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText('Carol')).toBeDefined();
  });

  test('shows medal emojis for top 3', () => {
    render(<LeaderboardTable rows={ROWS} valueLabel="Weekly XP" />);
    expect(screen.getByText('🥇')).toBeDefined();
    expect(screen.getByText('🥈')).toBeDefined();
    expect(screen.getByText('🥉')).toBeDefined();
  });

  test('displays value column', () => {
    render(<LeaderboardTable rows={ROWS} valueLabel="Weekly XP" />);
    expect(screen.getByText('1200 XP')).toBeDefined();
    expect(screen.getByText('800 XP')).toBeDefined();
  });

  test('shows value label in header', () => {
    render(<LeaderboardTable rows={ROWS} valueLabel="Weekly XP" />);
    expect(screen.getByText('Weekly XP')).toBeDefined();
  });

  test('shows level for each player', () => {
    render(<LeaderboardTable rows={ROWS} valueLabel="Weekly XP" />);
    expect(screen.getByText('Lv 5')).toBeDefined();
    expect(screen.getByText('Lv 3')).toBeDefined();
  });

  test('empty state when no rows', () => {
    render(<LeaderboardTable rows={[]} valueLabel="Weekly XP" />);
    expect(screen.getByText(/No data yet/i)).toBeDefined();
  });

  test('empty state when rows is undefined', () => {
    render(<LeaderboardTable valueLabel="Weekly XP" />);
    expect(screen.getByText(/No data yet/i)).toBeDefined();
  });
});
