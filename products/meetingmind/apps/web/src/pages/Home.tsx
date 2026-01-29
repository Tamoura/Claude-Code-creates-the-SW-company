import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Upload, Play, Video, Brain, TrendingUp } from 'lucide-react'

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // In a real app, this would handle the file upload
    // For prototype, we just show a message
    alert('File upload detected! In the prototype, click "View Demo" to see analysis.')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      alert('File selected! In the prototype, click "View Demo" to see analysis.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-12 h-12 text-blue-600" />
            <h1 className="text-5xl font-bold text-gray-900">MeetingMind</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The first meeting intelligence platform that analyzes video, audio, and screen shares simultaneously
          </p>
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <Video className="w-10 h-10 text-blue-600 mb-3" />
              <h3 className="font-semibold text-lg mb-2">Multimodal Analysis</h3>
              <p className="text-sm text-gray-600">
                Capture body language, engagement signals, and visual cues that audio-only tools miss
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Brain className="w-10 h-10 text-purple-600 mb-3" />
              <h3 className="font-semibold text-lg mb-2">AI-Powered Insights</h3>
              <p className="text-sm text-gray-600">
                Automatically detect confusion, key decisions, and action items from visual and verbal cues
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <TrendingUp className="w-10 h-10 text-green-600 mb-3" />
              <h3 className="font-semibold text-lg mb-2">Engagement Tracking</h3>
              <p className="text-sm text-gray-600">
                Real-time engagement metrics show when participants are confused or disengaged
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Upload Meeting Recording</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-colors
                  ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
                  hover:border-blue-400 cursor-pointer
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">
                  Drag and drop your meeting video
                </h3>
                <p className="text-gray-600 mb-4">
                  or click to browse files
                </p>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <span className="inline-block">
                    <Button variant="outline" type="button">
                      Select File
                    </Button>
                  </span>
                </label>
                <p className="text-sm text-gray-500 mt-4">
                  Supports MP4, WebM, and other common video formats
                </p>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Don't have a video? Try our demo analysis
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate('/analysis')}
                  className="gap-2"
                >
                  <Play className="w-5 h-5" />
                  View Demo Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <div className="max-w-3xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-center mb-6">What You'll Get</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'Synchronized video, audio, and screen share analysis',
              'Real-time engagement and emotion tracking',
              'Automatic action item extraction',
              'Confusion detection with timestamps',
              'Key decision highlights',
              'Exportable meeting summaries'
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-3 text-gray-700">
                <span className="text-green-600 mt-1">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
