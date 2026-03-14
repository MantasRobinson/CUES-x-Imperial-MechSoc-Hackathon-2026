import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakHeatmap from '../../src/components/Dashboard/StreakHeatmap';

describe('StreakHeatmap', () => {
  test('renders without crashing with no sessions', () => {
    render(<StreakHeatmap sessions={[]} />);
    expect(screen.getByTestId('streak-heatmap')).toBeDefined();
  });

  test('renders without crashing with sessions', () => {
    const sessions = [
      { startTime: new Date().toISOString(), durationMinutes: 45 },
      { startTime: new Date(Date.now() - 86400000).toISOString(), durationMinutes: 90 },
    ];
    render(<StreakHeatmap sessions={sessions} />);
    expect(screen.getByTestId('streak-heatmap')).toBeDefined();
  });

  test('renders legend labels', () => {
    render(<StreakHeatmap sessions={[]} />);
    expect(screen.getByText('Less')).toBeDefined();
    expect(screen.getByText('More')).toBeDefined();
  });

  test('renders 84 day cells (12 weeks)', () => {
    render(<StreakHeatmap sessions={[]} />);
    // Each cell has a title attribute with the date
    const cells = document.querySelectorAll('[title]');
    expect(cells.length).toBe(84);
  });
});
