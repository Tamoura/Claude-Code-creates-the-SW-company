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
import type { DimensionScores } from '@/types/index';

interface OrgFluencyChartProps {
  scores: DimensionScores;
}

export function OrgFluencyChart({ scores }: OrgFluencyChartProps) {
  const data = [
    { dimension: 'Delegation', score: scores.DELEGATION },
    { dimension: 'Description', score: scores.DESCRIPTION },
    { dimension: 'Discernment', score: scores.DISCERNMENT },
    { dimension: 'Diligence', score: scores.DILIGENCE },
  ];

  return (
    <div className="h-64 w-full" aria-label="Organisation fluency scores bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dimension"
            tick={{ fill: '#374151', fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '13px',
            }}
          />
          <Bar
            dataKey="score"
            fill="#4f46e5"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
