# MeetingMind - Prototype Concept

**Status**: Prototype
**Time Budget**: 2-4 hours
**Last Updated**: 2026-01-29

## Problem Statement

Current meeting intelligence tools (Otter.ai, Fireflies) only analyze audio transcripts, missing 70%+ of meeting information captured in video, body language, screen shares, and visual engagement cues. Remote teams lose critical context that would be visible in person, leading to:

- Missed non-verbal signals of confusion, disagreement, or disengagement
- Lost visual information shared via screen shares and presentations
- Incomplete understanding of meeting dynamics and participant engagement
- Inability to identify when action items are prompted by visual cues

## Target User Persona

**Name**: Sarah Chen
**Role**: Engineering Team Lead at a remote-first tech company
**Team Size**: 8-12 engineers across 4 time zones
**Meetings**: 3-5 hours daily (standups, sprint planning, design reviews, 1-on-1s)

**Pain Points**:
- Struggles to gauge team engagement in video calls (who's confused but not speaking up?)
- Misses important details shown in screen shares that aren't captured in transcripts
- Spends 30+ minutes after each meeting manually reviewing recordings to catch what she missed
- Can't easily identify when someone's body language shows disagreement even when they verbally agree
- Needs to create summaries for team members who couldn't attend

**Success Looks Like**:
Sarah can review a 1-hour meeting in 2 minutes, seeing automatically detected engagement drops, confusion signals, key screen share moments, and action items from both verbal and visual cues.

## Core Features for Prototype

### 1. Multimodal Meeting Upload
- Upload a sample meeting video file (MP4/WebM)
- Display video preview with playback controls
- Show file metadata (duration, size, format)

**Why**: Validates the upload flow and sets expectations for the analysis to come.

### 2. Simulated Real-Time Analysis Dashboard
- Display mock analysis results as if from Gemini Live API
- Show 3 simultaneous data streams:
  - **Video Analysis**: Engagement score graph, detected emotions/body language
  - **Audio/Transcript**: Key topics, speaker time distribution
  - **Screen Share**: Detected moments of screen sharing with thumbnails
- Timeline view showing all three streams synchronized

**Why**: Demonstrates the core value proposition - seeing ALL meeting data types analyzed simultaneously.

### 3. AI-Generated Insights Panel
- Mock output showing:
  - Meeting summary (3-4 bullet points)
  - Engagement drops with timestamps ("Confusion detected at 12:34 when discussing API design")
  - Action items extracted (3-5 items)
  - Key moments (screen shares, questions, decisions)
- Each insight clickable to jump to that moment in the video

**Why**: Shows the practical output users care about - actionable insights, not just raw data.

### 4. Visual Engagement Timeline
- Interactive timeline showing:
  - Engagement levels (high/medium/low) color-coded
  - Key moments marked (questions asked, decisions made, screen shares)
  - Hover to see snapshot + brief description
- Click to navigate video to that moment

**Why**: Provides the visual "at-a-glance" view that makes multimodal analysis valuable.

### 5. Export Summary
- Generate and download a 1-page meeting brief (PDF or Markdown)
- Include: summary, action items, key moments with timestamps, engagement highlights
- Shareable format for team members who missed the meeting

**Why**: Validates the end-to-end value - from meeting to shareable insights.

## Success Criteria

### Validation Goals
This prototype succeeds if we can demonstrate:

1. **Visual differentiation**: Users can immediately see this is different from transcript-only tools
2. **Value clarity**: Within 30 seconds, viewers understand what multimodal analysis provides
3. **Practical utility**: The insights shown solve Sarah's real pain points
4. **Technical feasibility**: Confirms Gemini Live API + OpenRouter can deliver this experience

### Prototype Metrics
- CEO can navigate the interface in <2 minutes
- All 5 core features functional with sample data
- Loading/rendering performance feels smooth (no lag)
- Visual design communicates "enterprise-ready, not a toy"

## What We're Testing

### Primary Hypotheses
1. **Value Proposition**: Do users immediately understand the benefit of multimodal analysis?
2. **UI Clarity**: Can users quickly find and interpret the most important insights?
3. **Differentiation**: Is this clearly different from existing transcript-only tools?
4. **Feasibility**: Can we build this with Gemini Live API + OpenRouter architecture?

### Key Questions to Answer
- Does the simultaneous 3-stream view make sense, or is it overwhelming?
- Are the engagement/emotion visualizations believable and useful?
- Would Sarah pay $29-79/month for this?
- What feature is most compelling? (focus full product on that)

## Technical Approach for Prototype

### Data Strategy
- Use pre-recorded sample meeting video (15-20 min)
- Mock all AI analysis results (JSON fixtures)
- Simulate "real-time" processing with delays/progress indicators
- No actual API calls (save costs, faster iteration)

### Frontend-Only
- Single Next.js application (port 3100)
- No backend/database for prototype
- All data stored in React state or local JSON files
- Deploy to Vercel for easy CEO review

### Libraries
- Video player: react-player or video.js
- Charts: recharts or chart.js (for engagement timeline)
- PDF export: jsPDF or react-pdf
- UI: Tailwind CSS + shadcn/ui

## Out of Scope for Prototype

### Explicitly NOT Included
- Real Gemini Live API integration (mock only)
- Real OpenRouter API calls (mock only)
- User authentication or accounts
- Meeting recording/capture (upload only)
- Live meeting analysis (pre-recorded only)
- Database or persistent storage
- Team collaboration features
- Calendar integrations
- Multiple meeting library/history
- Advanced AI model customization
- Mobile responsive design (desktop-first)
- Accessibility compliance (basic only)
- Production deployment (Vercel preview only)

### Why These Are Out
This is a proof-of-concept to validate the core value proposition. We're testing whether multimodal analysis is compelling, not building production infrastructure.

## Next Steps After Prototype

If the CEO approves moving forward:

1. **Full PRD**: Product Manager creates comprehensive requirements
2. **Architecture**: Architect designs real-time processing pipeline
3. **API Integration**: Backend Engineer integrates Gemini + OpenRouter
4. **MVP Build**: 2-week sprint for production-ready MVP
5. **Beta Testing**: Deploy to 5-10 alpha customers (including Sarah-like personas)

## Timeline Estimate

**Total: 3-4 hours**

- Setup & UI skeleton: 30 min
- Mock data creation: 30 min
- Video player + timeline: 45 min
- Analysis dashboard: 60 min
- Insights panel: 30 min
- Export functionality: 30 min
- Polish & review: 15 min

---

**Checkpoint**: CEO reviews prototype to decide:
- ✅ Build full product (proceed to PRD phase)
- 🔄 Pivot concept based on learnings
- ❌ Shelve idea and focus elsewhere
