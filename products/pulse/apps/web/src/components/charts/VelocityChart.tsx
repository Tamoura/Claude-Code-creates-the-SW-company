'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface VelocityChartProps {
  data?: Array<{ week: string; merged: number }>;
}

const defaultData = [
  { week: 'Week 1', merged: 18 },
  { week: 'Week 2', merged: 22 },
  { week: 'Week 3', merged: 16 },
  { week: 'Week 4', merged: 24 },
  { week: 'Week 5', merged: 20 },
  { week: 'Week 6', merged: 28 },
];

export default function VelocityChart({ data = defaultData }: VelocityChartProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
      <div className="text-sm text-[var(--text-secondary)] mb-4">PRs Merged Per Week</div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
          <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="merged" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
