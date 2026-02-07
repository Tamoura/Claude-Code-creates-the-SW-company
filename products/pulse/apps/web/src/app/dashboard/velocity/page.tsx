'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatCard from '../../../components/dashboard/StatCard';
import DateRangeSelector from '../../../components/common/DateRangeSelector';
import type { DateRange } from '../../../components/common/DateRangeSelector';

const mergedData = [
  { week: 'Week 1', merged: 18 },
  { week: 'Week 2', merged: 22 },
  { week: 'Week 3', merged: 16 },
  { week: 'Week 4', merged: 24 },
  { week: 'Week 5', merged: 20 },
  { week: 'Week 6', merged: 28 },
];

const cycleTimeData = [
  { week: 'Week 1', hours: 22 },
  { week: 'Week 2', hours: 19 },
  { week: 'Week 3', hours: 24 },
  { week: 'Week 4', hours: 17 },
  { week: 'Week 5', hours: 18 },
  { week: 'Week 6', hours: 15 },
];

export default function VelocityPage() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team Velocity</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            PR merge rates, cycle time trends, and review time metrics
          </p>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="PRs Merged" value="24" trend="+12% vs last week" />
        <StatCard title="Median Cycle Time" value="18h" trend="-2h vs last week" />
        <StatCard title="Review Time" value="4.2h" subtitle="Median time to first review" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PRs Merged Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
          <div className="text-sm text-[var(--text-secondary)] mb-4">PRs Merged Per Week</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mergedData}>
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

        {/* Cycle Time Chart */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl p-6">
          <div className="text-sm text-[var(--text-secondary)] mb-4">Cycle Time Trend</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cycleTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
              <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickFormatter={(value: number) => `${value}h`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value}h`, 'Cycle Time']}
              />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
