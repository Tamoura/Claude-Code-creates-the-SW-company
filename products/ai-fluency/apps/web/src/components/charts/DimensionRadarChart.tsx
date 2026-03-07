'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import type { DimensionScores } from '@/types/index';

interface DimensionRadarChartProps {
  dimensions: DimensionScores;
}

export function DimensionRadarChart({ dimensions }: DimensionRadarChartProps) {
  const data = [
    { dimension: 'Delegation', score: Math.round(dimensions.DELEGATION) },
    { dimension: 'Description', score: Math.round(dimensions.DESCRIPTION) },
    { dimension: 'Discernment', score: Math.round(dimensions.DISCERNMENT) },
    { dimension: 'Diligence', score: Math.round(dimensions.DILIGENCE) },
  ];

  return (
    <div className="mx-auto h-72 w-full max-w-md" aria-label="Dimension scores radar chart">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#4f46e5"
            fill="#4f46e5"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
