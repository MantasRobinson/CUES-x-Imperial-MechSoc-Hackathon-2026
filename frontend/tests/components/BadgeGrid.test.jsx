import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BadgeGrid from '../../src/components/Profile/BadgeGrid';

const BADGES = [
  { name: 'First Step',   description: 'Complete your first session.', rarity: 'Common',    iconEmoji: '👣' },
  { name: 'Hour of Power',description: 'Complete a 60 min session.',    rarity: 'Uncommon',  iconEmoji: '⚡' },
  { name: 'Iron Will',    description: '30-day streak.',                rarity: 'Epic',      iconEmoji: '🦾' },
];

describe('BadgeGrid', () => {
  test('renders a card per badge', () => {
    render(<BadgeGrid badges={BADGES} />);
    expect(screen.getByText('First Step')).toBeDefined();
    expect(screen.getByText('Hour of Power')).toBeDefined();
    expect(screen.getByText('Iron Will')).toBeDefined();
  });

  test('displays rarity labels', () => {
    render(<BadgeGrid badges={BADGES} />);
    expect(screen.getByText('Common')).toBeDefined();
    expect(screen.getByText('Uncommon')).toBeDefined();
    expect(screen.getByText('Epic')).toBeDefined();
  });

  test('shows empty state when no badges', () => {
    render(<BadgeGrid badges={[]} />);
    expect(screen.getByText(/No badges yet/i)).toBeDefined();
  });

  test('shows empty state when badges is undefined', () => {
    render(<BadgeGrid />);
    expect(screen.getByText(/No badges yet/i)).toBeDefined();
  });

  test('renders emoji icons', () => {
    render(<BadgeGrid badges={BADGES} />);
    expect(screen.getByText('👣')).toBeDefined();
    expect(screen.getByText('🦾')).toBeDefined();
  });
});
