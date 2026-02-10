'use client';

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { DIMENSIONS } from '../../lib/dimensions';

export interface DimensionScore {
  dimension: string;
  score: number;
  fullMark: number;
}

interface RadarChartProps {
  scores?: DimensionScore[];
}

const defaultScores: DimensionScore[] = DIMENSIONS.map((d) => ({
  dimension: d.name,
  score: 0,
  fullMark: 100,
}));

export default function RadarChart({ scores = defaultScores }: RadarChartProps) {
  return (
    <div
      className="w-full h-80"
      role="img"
      aria-label="Six-dimension radar chart showing child development scores"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart
          cx="50%"
          cy="50%"
          outerRadius="75%"
          data={scores}
        >
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#475569', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
            }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
