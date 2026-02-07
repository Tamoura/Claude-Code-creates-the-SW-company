'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatCard from '../../../components/dashboard/StatCard';
import DateRangeSelector from '../../../components/common/DateRangeSelector';
import type { DateRange } from '../../../components/common/DateRangeSelector';

const coverageData = [
  { date: 'Jan 1', coverage: 82.1 },
  { date: 'Jan 8', coverage: 83.5 },
  { date: 'Jan 15', coverage: 84.0 },
  { date: 'Jan 22', coverage: 83.8 },
  { date: 'Jan 29', coverage: 85.2 },
  { date: 'Feb 5', coverage: 87.3 },
];

const prSizeData = [
  { size: 'Small', count: 42 },
  { size: 'Medium', count: 28 },
  { size: 'Large', count: 12 },
  { size: 'XL', count: 4 },
];

export default function QualityPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Code Quality</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Test coverage trends, PR size distribution, and review comment patterns
          </p>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Test Coverage" value="87.3%" trend="+0.8% this sprint" />
        <StatCard title="Avg PR Size" value="186" subtitle="Lines changed per PR" />
        <StatCard title="Review Comments" value="3.2" subtitle="Avg comments per PR" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage Trend Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
          <div className="text-sm text-[var(--text-secondary)] mb-4">Test Coverage Trend</div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={coverageData}>
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
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* PR Size Distribution Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
          <div className="text-sm text-[var(--text-secondary)] mb-4">PR Size Distribution</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={prSizeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
              <XAxis dataKey="size" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
