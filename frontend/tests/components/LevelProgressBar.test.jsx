import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LevelProgressBar from '../../src/components/common/LevelProgressBar';

describe('LevelProgressBar', () => {
  test('renders level labels', () => {
    render(
      <LevelProgressBar
        level={3}
        progress={0.5}
        currentLevelXP={500}
        nextLevelXP={1400}
        totalXp={950}
      />
    );
    expect(screen.getByText('Level 3')).toBeDefined();
    expect(screen.getByText('Level 4')).toBeDefined();
  });

  test('progress bar has correct aria-valuenow', () => {
    render(
      <LevelProgressBar
        level={2}
        progress={0.25}
        currentLevelXP={100}
        nextLevelXP={500}
        totalXp={200}
      />
    );
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('25');
  });

  test('0% progress renders 0% width', () => {
    render(
      <LevelProgressBar level={1} progress={0} currentLevelXP={0} nextLevelXP={100} totalXp={0} />
    );
    expect(screen.getByRole('progressbar').style.width).toBe('0%');
  });

  test('100% progress renders 100% width', () => {
    render(
      <LevelProgressBar level={1} progress={1} currentLevelXP={0} nextLevelXP={100} totalXp={100} />
    );
    expect(screen.getByRole('progressbar').style.width).toBe('100%');
  });

  test('displays XP fraction label', () => {
    render(
      <LevelProgressBar
        level={2}
        progress={0.5}
        currentLevelXP={100}
        nextLevelXP={500}
        totalXp={300}
      />
    );
    // totalXp - currentLevelXP = 200, nextLevelXP - currentLevelXP = 400
    expect(screen.getByText('200 / 400 XP')).toBeDefined();
  });
});
