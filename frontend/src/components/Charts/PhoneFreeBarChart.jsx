import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/**
 * Daily phone-free minutes bar chart.
 * @param {{ data: Array<{date: string, minutes: number}> }} props
 */
export default function PhoneFreeBarChart({ data }) {
  const formatted = (data || []).map((d) => ({
    ...d,
    label: d.date.slice(5), // "MM-DD"
    hours: parseFloat((d.minutes / 60).toFixed(2)),
  }));

  return (
    <div className="card" data-testid="phone-free-bar-chart">
      <h3 className="font-semibold text-gray-200 mb-3">Phone-Free Time</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis
            unit="h"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            formatter={(v) => [`${v.toFixed(2)}h`, 'Phone-free']}
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Bar dataKey="hours" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
