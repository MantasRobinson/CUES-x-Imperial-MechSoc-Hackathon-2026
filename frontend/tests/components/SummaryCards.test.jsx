import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SummaryCards from '../../src/components/Dashboard/SummaryCards';

describe('SummaryCards', () => {
  test('renders all four stat cards', () => {
    render(
      <SummaryCards
        todayMinutes={45}
        todayXP={500}
        currentStreak={7}
        level={3}
      />
    );
    expect(screen.getByTestId('summary-cards')).toBeDefined();
    expect(screen.getByText('45m')).toBeDefined();
    expect(screen.getByText('500 XP')).toBeDefined();
    expect(screen.getByText('7 days')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  test('shows "1 day" (singular) for streak of 1', () => {
    render(<SummaryCards currentStreak={1} todayMinutes={0} todayXP={0} level={1} />);
    expect(screen.getByText('1 day')).toBeDefined();
  });

  test('handles zero / undefined values gracefully', () => {
    render(<SummaryCards />);
    expect(screen.getByText('0m')).toBeDefined();
    expect(screen.getByText('0 XP')).toBeDefined();
    expect(screen.getByText('0 days')).toBeDefined();
  });
});
