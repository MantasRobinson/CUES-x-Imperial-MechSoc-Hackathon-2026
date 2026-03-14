import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/**
 * Cumulative XP accumulation curve.
 * @param {{ data: Array<{date: string, xp: number}> }} props
 */
export default function XPCurveChart({ data }) {
  // Compute cumulative XP
  let cumulative = 0;
  const formatted = (data || []).map((d) => {
    cumulative += d.xp;
    return { label: d.date.slice(5), cumXP: cumulative };
  });

  return (
    <div className="card" data-testid="xp-curve-chart">
      <h3 className="font-semibold text-gray-200 mb-3">XP Accumulation</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            formatter={(v) => [`${v.toLocaleString()} XP`, 'Total XP']}
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Line
            type="monotone"
            dataKey="cumXP"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
