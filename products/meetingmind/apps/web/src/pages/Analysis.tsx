import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { VideoPlayer } from '../components/VideoPlayer'
import type { VideoPlayerRef } from '../components/VideoPlayer'
import { EngagementTimeline } from '../components/EngagementTimeline'
import { InsightsPanel } from '../components/InsightsPanel'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { exportMeetingToPDF } from '../lib/pdf-export'
import { ArrowLeft, Download, Users, Clock } from 'lucide-react'

// Import mock data
import meetingMetadata from '../data/mock/meeting-metadata.json'
import transcript from '../data/mock/transcript.json'
import engagement from '../data/mock/engagement.json'
import screenshare from '../data/mock/screenshare.json'
import insights from '../data/mock/insights.json'

export const Analysis: React.FC = () => {
  const navigate = useNavigate()
  const videoPlayerRef = useRef<VideoPlayerRef>(null)
  const [currentTime, setCurrentTime] = useState(0)

  const handleProgress = (state: { playedSeconds: number }) => {
    setCurrentTime(Math.floor(state.playedSeconds))
  }

  const handleTimeClick = (time: number) => {
    videoPlayerRef.current?.seekTo(time)
  }

  const handleExportPDF = () => {
    const pdfData = {
      title: meetingMetadata.title,
      date: meetingMetadata.date,
      duration: meetingMetadata.duration,
      participants: meetingMetadata.participants,
      summary: insights.summary,
      actionItems: insights.actionItems,
      keyMoments: insights.keyMoments,
      engagementSummary: {
        average: engagement.summary.averageEngagement,
        peak: engagement.summary.peakEngagement,
        lowest: engagement.summary.lowestEngagement
      }
    }
    exportMeetingToPDF(pdfData)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {meetingMetadata.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(meetingMetadata.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {meetingMetadata.participants.length} participants
                  </span>
                  <span>
                    {new Date(meetingMetadata.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleExportPDF}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export Summary
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Video and Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <VideoPlayer
              ref={videoPlayerRef}
              url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              onProgress={handleProgress}
            />

            {/* Engagement Timeline */}
            <EngagementTimeline
              data={engagement.dataPoints}
              currentTime={currentTime}
              onTimeClick={handleTimeClick}
            />

            {/* Transcript & Screen Shares */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Transcript */}
              <Card>
                <CardHeader>
                  <CardTitle>Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {transcript.segments.slice(0, 8).map((segment, index) => (
                      <div
                        key={index}
                        className="p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                        onClick={() => handleTimeClick(
                          parseInt(segment.timestamp.split(':')[0]) * 60 +
                          parseInt(segment.timestamp.split(':')[1])
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-blue-600">
                            {segment.timestamp}
                          </span>
                          <span className="text-xs font-medium text-gray-700">
                            {segment.speaker}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {segment.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Screen Share Moments */}
              <Card>
                <CardHeader>
                  <CardTitle>Screen Share Moments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {screenshare.moments.map((moment, index) => (
                      <div
                        key={index}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleTimeClick(moment.timeInSeconds)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-16 h-12 rounded flex-shrink-0"
                            style={{ backgroundColor: moment.thumbnailColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="default">{moment.type}</Badge>
                              <span className="text-xs text-blue-600">
                                {moment.timestamp}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {moment.title}
                            </p>
                            <p className="text-xs text-gray-600">
                              {moment.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">
                        {screenshare.analytics.percentageOfMeeting}%
                      </span>{' '}
                      of meeting time included screen sharing
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {meetingMetadata.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-2"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                        {participant.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {participant.name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {participant.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Insights */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <InsightsPanel
                summary={insights.summary}
                actionItems={insights.actionItems as any}
                keyMoments={insights.keyMoments}
                onTimeClick={handleTimeClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
