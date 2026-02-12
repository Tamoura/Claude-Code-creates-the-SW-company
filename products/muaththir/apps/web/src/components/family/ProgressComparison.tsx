'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DIMENSIONS } from '../../lib/dimensions';

interface ProgressComparisonProps {
  childProfiles: Array<{
    name: string;
    dimensions: Array<{
      dimension: string;
      score: number;
    }>;
  }>;
}

export default function ProgressComparison({
  childProfiles,
}: ProgressComparisonProps) {
  const td = useTranslations('dimensions');

  // Transform data for recharts
  const chartData = DIMENSIONS.map((dim) => {
    const dataPoint: Record<string, string | number> = {
      dimension: td(dim.slug as any),
    };

    childProfiles.forEach((child) => {
      const dimScore = child.dimensions.find((d) => d.dimension === dim.slug);
      dataPoint[child.name] = dimScore?.score || 0;
    });

    return dataPoint;
  });

  // Generate colors for each child
  const childColors = [
    '#3B82F6', // blue
    '#EC4899', // pink
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#10B981', // emerald
    '#EF4444', // red
  ];

  return (
    <div
        className="w-full"
        role="img"
        aria-label="Bar chart comparing children's dimension scores"
      >
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis
              dataKey="dimension"
              tick={{ fill: '#64748b', fontSize: 12 }}
              stroke="#cbd5e1"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 12 }}
              stroke="#cbd5e1"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
              labelStyle={{ color: '#1e293b', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: '0.875rem' }}
              iconType="rect"
            />
            {childProfiles.map((child, index) => (
              <Bar
                key={child.name}
                dataKey={child.name}
                fill={childColors[index % childColors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
  );
}
