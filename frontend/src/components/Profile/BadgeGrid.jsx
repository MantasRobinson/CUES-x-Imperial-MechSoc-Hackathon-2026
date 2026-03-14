import React from 'react';

const RARITY_CLASS = {
  Common:    'badge-common',
  Uncommon:  'badge-uncommon',
  Rare:      'badge-rare',
  Epic:      'badge-epic',
  Legendary: 'badge-legendary',
};

/**
 * @param {{ badges: Array<{name, description, rarity, iconEmoji, earnedAt}> }} props
 */
export default function BadgeGrid({ badges }) {
  if (!badges || badges.length === 0) {
    return (
      <div className="card text-center text-gray-500 py-8" data-testid="badge-grid">
        No badges yet — complete sessions to earn them!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" data-testid="badge-grid">
      {badges.map((b) => (
        <div
          key={b.name}
          title={b.description}
          className={`card flex flex-col items-center text-center gap-1 cursor-default hover:scale-105 transition-transform ${RARITY_CLASS[b.rarity] || ''}`}
        >
          <span className="text-3xl">{b.iconEmoji || '🏅'}</span>
          <p className="text-xs font-semibold leading-tight">{b.name}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${RARITY_CLASS[b.rarity]}`}>
            {b.rarity}
          </span>
        </div>
      ))}
    </div>
  );
}
