# MeetingMind - Agent Addendum

## Product Overview

**Name**: MeetingMind
**Type**: Web App (Prototype)
**Status**: Prototype - Concept Validation Phase
**Time Budget**: 2-4 hours total build time
**Goal**: Validate multimodal meeting intelligence concept before committing to full product

**Prototype Purpose**: Demonstrate that analyzing video + audio + screen shares simultaneously provides significantly more value than transcript-only meeting tools.

## What Is MeetingMind?

The first meeting intelligence platform that analyzes video, audio, and screen shares simultaneously using multimodal AI. Unlike Otter.ai or Fireflies (audio-only), MeetingMind captures body language, engagement signals, visual confusion cues, and screen share content - providing a complete picture of meeting dynamics.

**Key Innovation**: Gemini Live API processes video + audio in real-time, while OpenRouter orchestrates multiple specialized models for summaries, action items, and insights.

## Target User

**Engineering Team Lead** managing 8-12 remote engineers across multiple time zones. Spends 3-5 hours daily in meetings, struggles to gauge engagement in video calls, and needs to quickly review recordings to catch missed context.

## Tech Stack (Prototype)

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 14, React 18, TypeScript | Single app, no backend needed for prototype |
| Styling | Tailwind CSS + shadcn/ui | Clean, professional enterprise UI |
| Video | react-player | Simple, reliable video playback |
| Charts | recharts | Engagement timeline visualization |
| Export | jsPDF or react-pdf | Generate meeting summary PDFs |
| Testing | Vitest (if time permits) | Not required for prototype |
| Deployment | Vercel | Quick preview deployment for CEO review |

## Core Features (Prototype Only)

### 1. Meeting Upload
- Upload sample video file (MP4/WebM)
- Display video with playback controls
- Show metadata

### 2. Analysis Dashboard
- 3 synchronized data streams: Video Analysis, Audio/Transcript, Screen Share
- Mock data (no real API calls)
- Timeline view showing all streams

### 3. Insights Panel
- Meeting summary
- Engagement drops with timestamps
- Action items
- Key moments
- Clickable to jump to video timestamp

### 4. Visual Engagement Timeline
- Interactive timeline with color-coded engagement levels
- Marked key moments
- Hover previews

### 5. Export Summary
- Generate 1-page meeting brief
- Download as PDF or Markdown

## Mock Data Strategy

**IMPORTANT**: This prototype uses mock/fixture data. No real API calls to save costs and enable rapid iteration.

### Sample Data Needed
1. **Video file**: 15-20 min sample meeting recording
2. **Transcript**: JSON fixture with timestamps
3. **Engagement data**: Array of timestamp + score + emotion
4. **Screen share moments**: Array of timestamp + thumbnail + description
5. **Insights**: Pre-written summary, action items, key moments

### Mock Data Location
Store in: `products/meetingmind/apps/web/data/mock/`
- `meeting-video.mp4` (or link to external hosting)
- `transcript.json`
- `engagement.json`
- `screenshare.json`
- `insights.json`

## Site Map (Prototype)

| Route | Status | Description |
|-------|--------|-------------|
| / | Prototype | Landing page with upload + demo link |
| /analysis/[id] | Prototype | Main analysis dashboard with all features |

No other routes needed for prototype.

## External APIs (Future - Not in Prototype)

| Service | Purpose | Documentation |
|---------|---------|---------------|
| Gemini Live API | Real-time multimodal video + audio analysis | https://ai.google.dev/gemini-api/docs/multimodal-live |
| OpenRouter | AI model orchestration (Claude, GPT-4) | https://openrouter.ai/docs |
| Google Cloud Storage | Video file storage | https://cloud.google.com/storage/docs |

**Prototype Note**: These are NOT used in the prototype. All analysis is mocked.

## Performance Requirements (Prototype)

- Video playback: Smooth, no stuttering
- Timeline rendering: <500ms
- Page load: <2s
- Bundle size: No specific target (keep reasonable)

## Design Guidelines

### Visual Style
- Professional, enterprise-ready aesthetic
- NOT a toy or demo app look
- Clean, data-dense but not overwhelming
- Color-coded engagement levels (green=high, yellow=medium, red=low)

### Key Principles
1. **Immediate clarity**: Value prop obvious within 30 seconds
2. **Visual hierarchy**: Most important insights above the fold
3. **Credible data**: Mock analysis must look realistic
4. **Smooth interactions**: No janky transitions or loading states

## Special Considerations for Engineers

### Frontend Engineer
- Focus on UI polish - this prototype needs to look production-ready
- Use realistic mock data (not "lorem ipsum" or obvious placeholders)
- Make timeline interactive and smooth
- Ensure video playback is reliable
- Export feature should generate real PDFs, not just "Download" buttons

### Architect (if involved)
- This is intentionally frontend-only
- No backend, database, or real API integration needed
- Keep it simple - goal is visual demonstration, not production architecture

### QA Engineer (if involved)
- Manual testing only (no automated tests required for prototype)
- Test on Chrome, Safari (primary browsers)
- Verify all 5 core features work
- Check that exported PDFs are readable

### DevOps Engineer (if involved)
- Deploy to Vercel preview URL
- No CI/CD pipeline needed for prototype
- Just need a shareable link for CEO review

## Validation Criteria

The prototype succeeds if:

1. CEO can navigate all features in <2 minutes
2. The multimodal analysis value is immediately clear
3. UI looks professional and enterprise-ready
4. All mock data appears realistic (not obviously fake)
5. CEO decides to greenlight full product development

## Out of Scope (Critical)

**Do NOT build**:
- Real API integrations
- User authentication
- Database or backend
- Meeting recording/capture
- Live meeting analysis
- Multiple meeting library
- Team collaboration
- Mobile responsive design
- Production-grade error handling

**Why**: This is a throwaway prototype. If CEO approves, we'll build the real product from scratch with proper architecture.

## Next Steps After Prototype

If CEO approves:
1. **Full PRD**: Product Manager writes comprehensive requirements
2. **Architecture Design**: System design for real-time processing
3. **API Integration**: Real Gemini + OpenRouter implementation
4. **MVP Build**: 2-week sprint for production-ready version

## Sample Mock Data Structure

### Engagement Data
```json
{
  "engagement": [
    {
      "timestamp": "00:02:34",
      "score": 0.85,
      "emotion": "engaged",
      "note": "Active discussion about API design"
    },
    {
      "timestamp": "00:12:45",
      "score": 0.32,
      "emotion": "confused",
      "note": "Participants showing confusion during architecture explanation"
    }
  ]
}
```

### Insights Data
```json
{
  "summary": [
    "Team reviewed Q1 API architecture decisions",
    "Identified 3 blockers for microservices migration",
    "Agreed to prototype GraphQL federation approach"
  ],
  "actionItems": [
    {
      "text": "Sarah to create RFC for GraphQL schema design",
      "owner": "Sarah Chen",
      "dueDate": "2026-02-05",
      "timestamp": "00:15:23"
    }
  ],
  "keyMoments": [
    {
      "timestamp": "00:08:12",
      "type": "decision",
      "description": "Team decided to use GraphQL Federation"
    },
    {
      "timestamp": "00:12:45",
      "type": "confusion",
      "description": "Confusion about service boundary definitions"
    }
  ]
}
```

---

**Created by**: Product Manager
**Last Updated**: 2026-01-29
**For**: Prototype validation phase only
