import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const COLOURS = { Quiet: '#22c55e', Moderate: '#f59e0b', Loud: '#ef4444' };

/**
 * @param {{ distribution: {Quiet: number, Moderate: number, Loud: number} }} props
 */
export default function NoisePieChart({ distribution }) {
  const data = Object.entries(distribution || {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="card flex items-center justify-center h-40 text-gray-500 text-sm" data-testid="noise-pie-chart">
        No session data yet.
      </div>
    );
  }

  return (
    <div className="card" data-testid="noise-pie-chart">
      <h3 className="font-semibold text-gray-200 mb-3">Noise Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLOURS[entry.name] || '#6b7280'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, name) => [`${v} sessions`, name]}
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
