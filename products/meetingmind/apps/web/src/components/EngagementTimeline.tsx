import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { formatTimestamp } from '../lib/utils'

interface DataPoint {
  time: number
  score: number
  emotion: string
  note: string
}

interface EngagementTimelineProps {
  data: DataPoint[]
  currentTime?: number
  onTimeClick?: (time: number) => void
}

export const EngagementTimeline: React.FC<EngagementTimelineProps> = ({
  data,
  currentTime = 0,
  onTimeClick
}) => {
  const getColorForScore = (score: number) => {
    if (score >= 0.75) return '#10B981' // green
    if (score >= 0.5) return '#F59E0B' // yellow
    return '#EF4444' // red
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{formatTimestamp(data.time)}</p>
          <p className="text-sm text-gray-600">
            Engagement: {(data.score * 100).toFixed(0)}%
          </p>
          <p className="text-sm text-gray-600">
            {data.emotion.replace('_', ' ').toUpperCase()}
          </p>
          <p className="text-sm mt-1">{data.note}</p>
        </div>
      )
    }
    return null
  }

  const handleClick = (data: any) => {
    if (data && data.activePayload && onTimeClick) {
      onTimeClick(data.activePayload[0].payload.time)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              onClick={handleClick}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tickFormatter={formatTimestamp}
                stroke="#6b7280"
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0.75} stroke="#10B981" strokeDasharray="3 3" />
              <ReferenceLine y={0.5} stroke="#F59E0B" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={getColorForScore(payload.score)}
                      stroke="white"
                      strokeWidth={2}
                    />
                  )
                }}
                activeDot={{ r: 6 }}
              />
              {currentTime > 0 && (
                <ReferenceLine
                  x={currentTime}
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  label={{ value: 'Now', position: 'top' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>High (75%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Medium (50-75%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Low (&lt;50%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
