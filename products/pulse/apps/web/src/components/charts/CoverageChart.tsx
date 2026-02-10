'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CoverageChartProps {
  data?: Array<{ date: string; coverage: number }>;
}

const defaultData = [
  { date: 'Jan 1', coverage: 82.1 },
  { date: 'Jan 8', coverage: 83.5 },
  { date: 'Jan 15', coverage: 84.0 },
  { date: 'Jan 22', coverage: 83.8 },
  { date: 'Jan 29', coverage: 85.2 },
  { date: 'Feb 5', coverage: 87.3 },
];

export default function CoverageChart({ data = defaultData }: CoverageChartProps) {
  const summary = data
    .map((d) => `${d.date}: ${d.coverage}%`)
    .join(', ');

  return (
    <section
      className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6"
      aria-label="Test coverage trend chart"
    >
      <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Test Coverage Trend</h2>
      <div role="img" aria-label={`Area chart showing test coverage trend: ${summary}`}>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
            <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <YAxis
              domain={[75, 100]}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              tickFormatter={(value: number) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value}%`, 'Coverage']}
            />
            <Area
              type="monotone"
              dataKey="coverage"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.1}
              strokeWidth={2}
              name="Test Coverage"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Screen reader accessible data table */}
      <table className="sr-only">
        <caption>Test Coverage Trend</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.coverage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
