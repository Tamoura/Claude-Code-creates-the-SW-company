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
  const summary = data
    .map((d) => `${d.week}: ${d.merged} PRs`)
    .join(', ');

  return (
    <section
      className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6"
      aria-label="PRs merged per week chart"
    >
      <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-4">PRs Merged Per Week</h2>
      <div role="img" aria-label={`Bar chart showing PRs merged per week: ${summary}`}>
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
            <Bar dataKey="merged" fill="#6366f1" radius={[4, 4, 0, 0]} name="PRs Merged" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Screen reader accessible data table */}
      <table className="sr-only">
        <caption>PRs Merged Per Week</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">PRs Merged</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.week}>
              <td>{d.week}</td>
              <td>{d.merged}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
