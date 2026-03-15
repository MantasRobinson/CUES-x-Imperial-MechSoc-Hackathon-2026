import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/**
 * Session length distribution histogram.
 * @param {{ histogram: {'0-15': number, '15-30': number, '30-60': number, '60-120': number, '120+': number} }} props
 */
export default function SessionHistogram({ histogram }) {
  const data = Object.entries(histogram || {}).map(([bucket, count]) => ({
    bucket,
    count,
  }));

  return (
    <div className="card" data-testid="session-histogram">
      <h3 className="font-semibold text-gray-200 mb-3">Session Length Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="bucket"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            label={{ value: 'Minutes', position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 11 }}
          />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            formatter={(v) => [`${v} sessions`, 'Count']}
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
