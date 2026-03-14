import React, { useState } from 'react';
import { formatDate, formatTime, formatDuration } from '../../utils/dateHelpers';

const NOISE_COLOURS = {
  Quiet:    'text-green-400',
  Moderate: 'text-yellow-400',
  Loud:     'text-red-400',
};

export default function SessionTable({ sessions }) {
  const [sortField, setSortField] = useState('startTime');
  const [sortDir,   setSortDir]   = useState('desc');
  const [filter,    setFilter]    = useState('');

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = [...(sessions || [])]
    .filter((s) => {
      if (!filter) return true;
      const f = filter.toLowerCase();
      return (
        s.noiseLevel?.toLowerCase().includes(f) ||
        formatDate(s.startTime).toLowerCase().includes(f)
      );
    })
    .sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1  : -1;
      return 0;
    });

  const SortIcon = ({ field }) => (
    <span className="ml-1 text-gray-500">
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const Th = ({ field, label }) => (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white select-none"
      onClick={() => toggleSort(field)}
    >
      {label}<SortIcon field={field} />
    </th>
  );

  return (
    <div className="card" data-testid="session-table">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-200">Session History</h2>
        <input
          className="input w-40 text-sm py-1"
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <Th field="startTime"       label="Date" />
              <Th field="durationMinutes" label="Duration" />
              <Th field="noiseLevel"      label="Noise" />
              <Th field="disturbanceCount" label="Disturbances" />
              <Th field="xpEarned"        label="XP" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">
                  No sessions yet. Place your phone in the box to start!
                </td>
              </tr>
            ) : sorted.map((s) => (
              <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-3 py-2 text-gray-300">
                  {formatDate(s.startTime)} <span className="text-gray-500">{formatTime(s.startTime)}</span>
                </td>
                <td className="px-3 py-2 text-gray-200 font-medium">
                  {formatDuration(s.durationMinutes)}
                </td>
                <td className={`px-3 py-2 font-medium ${NOISE_COLOURS[s.noiseLevel] || 'text-gray-300'}`}>
                  {s.noiseLevel}
                </td>
                <td className="px-3 py-2 text-gray-300">{s.disturbanceCount}</td>
                <td className="px-3 py-2 text-yellow-400 font-semibold">+{s.xpEarned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
