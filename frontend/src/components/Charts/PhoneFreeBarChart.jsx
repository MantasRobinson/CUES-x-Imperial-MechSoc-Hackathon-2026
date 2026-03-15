import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const toHours = (min) => parseFloat((min / 60).toFixed(2));

/**
 * Daily phone-free minutes bar chart, stacked by noise level.
 * @param {{ data: Array<{date, minutes, quietMinutes, moderateMinutes, loudMinutes}> }} props
 */
export default function PhoneFreeBarChart({ data }) {
  const formatted = (data || []).map((d) => ({
    label: d.date.slice(5),
    quiet:    toHours(d.quietMinutes    || 0),
    moderate: toHours(d.moderateMinutes || 0),
    loud:     toHours(d.loudMinutes     || 0),
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
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            formatter={(v, name) => [`${v.toFixed(2)}h`, name.charAt(0).toUpperCase() + name.slice(1)]}
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 4 }}
          />
          <Bar dataKey="quiet"    stackId="a" fill="#22c55e" name="Quiet"    radius={[0, 0, 0, 0]} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="moderate" stackId="a" fill="#f59e0b" name="Moderate" radius={[0, 0, 0, 0]} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="loud"     stackId="a" fill="#ef4444" name="Loud"     radius={[4, 4, 0, 0]} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
