import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Badge } from './ui/Badge'
import { CheckCircle, Clock, AlertCircle, Zap } from 'lucide-react'

interface ActionItem {
  id: string
  text: string
  owner: string
  dueDate: string
  timestamp: string
  timeInSeconds: number
  priority: 'high' | 'medium' | 'low'
}

interface KeyMoment {
  id: string
  timestamp: string
  timeInSeconds: number
  type: string
  title: string
  description: string
  significance: string
}

interface InsightsPanelProps {
  summary: string[]
  actionItems: ActionItem[]
  keyMoments: KeyMoment[]
  onTimeClick?: (time: number) => void
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  summary,
  actionItems,
  keyMoments,
  onTimeClick
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'decision':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'action_item':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'confusion':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'high_engagement':
        return <Zap className="w-4 h-4 text-purple-600" />
      default:
        return <Zap className="w-4 h-4 text-gray-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'decision':
        return <Badge variant="success">Decision</Badge>
      case 'action_item':
        return <Badge>Action</Badge>
      case 'confusion':
        return <Badge variant="warning">Confusion</Badge>
      case 'high_engagement':
        return <Badge variant="default">High Engagement</Badge>
      case 'screen_share':
        return <Badge variant="default">Screen Share</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="danger">High</Badge>
      case 'medium':
        return <Badge variant="warning">Medium</Badge>
      case 'low':
        return <Badge variant="default">Low</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {summary.map((point, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span className="text-gray-700">{point}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Action Items ({actionItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onTimeClick?.(item.timeInSeconds)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-gray-900 flex-1">
                    {item.text}
                  </p>
                  {getPriorityBadge(item.priority)}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="font-medium">{item.owner}</span>
                  <span>•</span>
                  <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="text-blue-600 hover:underline">
                    {item.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Moments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Key Moments ({keyMoments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keyMoments.map((moment) => (
              <div
                key={moment.id}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onTimeClick?.(moment.timeInSeconds)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getTypeIcon(moment.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(moment.type)}
                      <span className="text-xs text-blue-600 hover:underline">
                        {moment.timestamp}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {moment.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {moment.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
