# MeetingMind

**Status**: Prototype
**Branch**: `prototype/meetingmind`
**Last Updated**: 2026-01-29

## Overview

MeetingMind is the first meeting intelligence platform that analyzes video, audio, and screen shares simultaneously using multimodal AI. Unlike audio-only tools (Otter.ai, Fireflies), MeetingMind captures body language, engagement signals, visual confusion cues, and screen share content - providing a complete picture of meeting dynamics.

## Problem

Current meeting intelligence tools only analyze audio transcripts, missing 70%+ of meeting information captured in video, body language, screen shares, and visual engagement cues. Remote teams lose critical context that would be visible in person.

## Solution

MeetingMind uses Gemini Live API for real-time multimodal analysis and OpenRouter for AI orchestration to provide:
- Real-time engagement and emotion tracking
- Automatic confusion detection via body language
- Screen share content analysis
- Action item extraction from visual and verbal cues
- Comprehensive meeting summaries

## Target User

**Engineering Team Leads** managing 8-12 remote engineers across multiple time zones who spend 3-5 hours daily in meetings and struggle to gauge engagement in video calls.

## Current Status: Prototype

This is a proof-of-concept prototype built in ~2 hours to validate the multimodal analysis concept.

### What's Built

1. **Upload Interface** - File upload UI with demo access
2. **Analysis Dashboard** - 3 synchronized data streams (video, transcript, screen shares)
3. **AI Insights Panel** - Summary, action items, key moments
4. **Visual Timeline** - Interactive engagement tracking
5. **Export Summary** - PDF generation

### Tech Stack (Prototype)

- Vite + React 18 + TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- react-player, Recharts, jsPDF
- Mock data (no real API calls)

### Running the Prototype

```bash
cd apps/web
npm install
npm run dev
```

Visit http://localhost:3100

### Tests

```bash
cd apps/web
npm test
```

15 tests, all passing.

## Documentation

- **Concept**: `docs/CONCEPT.md` - Problem, solution, success criteria
- **Addendum**: `.claude/addendum.md` - Agent implementation guidance
- **ADR-001**: `docs/ADRs/ADR-001-prototype-tech.md` - Tech stack decisions

## Validation Criteria

The prototype succeeds if:
1. CEO can navigate all features in <2 minutes
2. Multimodal analysis value is immediately clear
3. UI looks professional and enterprise-ready
4. Mock data appears realistic
5. CEO decides to greenlight full product development

## Next Steps (If Approved)

1. **Full PRD** - Product Manager writes comprehensive requirements
2. **Architecture** - System design for real-time processing pipeline
3. **API Integration** - Real Gemini Live + OpenRouter implementation
4. **MVP Build** - 2-week sprint for production version
5. **Beta Testing** - Deploy to 5-10 alpha customers

## Key Features for Full Product

- Real-time multimodal AI processing
- User authentication and accounts
- Meeting recording/capture
- Team collaboration features
- Calendar integrations
- Meeting library/history
- Mobile responsive design
- Production deployment on Vercel
- WCAG accessibility compliance

## Directory Structure

```
products/meetingmind/
├── apps/
│   └── web/              # Prototype frontend (Vite + React)
├── docs/
│   ├── CONCEPT.md        # Product concept
│   └── ADRs/             # Architecture decisions
├── .claude/
│   └── addendum.md       # Agent guidance
└── README.md             # This file
```

## License

Copyright 2026 ConnectSW. Proprietary prototype.
