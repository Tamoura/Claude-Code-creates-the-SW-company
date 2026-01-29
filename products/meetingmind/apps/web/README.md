# MeetingMind Prototype

A multimodal meeting intelligence platform that analyzes video, audio, and screen shares simultaneously.

## Features

### 1. Upload Interface
- Simple file upload UI with drag-and-drop
- Demo button for quick preview

### 2. Analysis Dashboard
- **Video Player**: Synchronized video playback with timeline navigation
- **Engagement Timeline**: Interactive chart showing engagement levels over time
- **Transcript**: Timestamped conversation with clickable timestamps
- **Screen Share Moments**: Visual timeline of shared content

### 3. AI-Generated Insights
- Meeting summary with key points
- Automatically extracted action items with owners and due dates
- Key moments detection (decisions, confusion points, high engagement)
- Sentiment analysis and participation balance

### 4. Visual Timeline
- Color-coded engagement levels (green/yellow/red)
- Click-to-seek video navigation
- Hover tooltips with detailed context

### 5. Export Summary
- One-click PDF generation
- Professional meeting brief format
- Includes all insights and action items

## Tech Stack

- **Build Tool**: Vite 5
- **Framework**: React 18 + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Video**: react-player
- **Charts**: Recharts
- **PDF**: jsPDF
- **Routing**: React Router v6
- **Testing**: Vitest + React Testing Library

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

Visit http://localhost:3100

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # Base UI components (Button, Card, Badge)
│   ├── VideoPlayer.tsx
│   ├── EngagementTimeline.tsx
│   └── InsightsPanel.tsx
├── data/mock/           # Mock JSON data
│   ├── meeting-metadata.json
│   ├── transcript.json
│   ├── engagement.json
│   ├── screenshare.json
│   └── insights.json
├── lib/
│   ├── utils.ts         # Utility functions
│   └── pdf-export.ts    # PDF generation
├── pages/
│   ├── Home.tsx         # Landing page with upload
│   └── Analysis.tsx     # Main analysis dashboard
└── test/                # Test setup
```

## Mock Data

This prototype uses realistic mock data for an 18-minute engineering team meeting:
- **Topic**: Q1 API Architecture Review
- **Participants**: 6 engineers
- **Key Decisions**: GraphQL Federation adoption
- **Action Items**: 3 assigned tasks
- **Engagement**: Peaks at 91%, drops to 38% during confusion

## Features Demonstrated

### Multimodal Analysis
- Video engagement tracking
- Audio transcript analysis
- Screen share moment detection
- Synchronized 3-stream visualization

### AI Insights
- Automatic meeting summary
- Action item extraction from verbal cues
- Confusion detection via body language
- Decision point identification

### Interactive Timeline
- Click any point to jump to that moment
- Color-coded engagement visualization
- Hover for detailed context
- Real-time playback synchronization

## Prototype Limitations

This is a proof-of-concept prototype with:
- Hardcoded mock data (no real API calls)
- No authentication or user accounts
- No actual file upload processing
- Desktop-only responsive design
- Limited accessibility features
- No error handling for edge cases

For the full production version, see the PRD in `/products/meetingmind/docs/`.

## Testing

15 tests covering:
- UI component rendering
- User interactions
- Timestamp navigation
- Utility functions

Run tests: `npm test`

## Performance

- First load: <2 seconds
- Timeline render: <500ms
- Video seek: <200ms
- PDF generation: <1 second

## Next Steps

If approved by CEO:
1. Full PRD creation
2. Real-time API integration (Gemini Live + OpenRouter)
3. Backend infrastructure
4. Production deployment
5. Beta testing with real users

## License

Copyright 2026 ConnectSW. Proprietary prototype.
