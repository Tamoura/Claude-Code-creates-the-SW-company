# ADR-001: Prototype Tech Stack

**Status**: Accepted
**Date**: 2026-01-29
**Context**: Rapid prototype to validate MeetingMind concept (2-4 hour build)

## Decision

**Frontend-Only Stack**:
- **Build Tool**: Vite 5 + React 18 + TypeScript 5
- **Styling**: Tailwind CSS 3 + shadcn/ui
- **Video Player**: react-player
- **Charts**: Recharts
- **PDF Export**: jsPDF
- **Routing**: React Router v6
- **Deployment**: Vercel

**No Backend**: All data mocked via JSON fixtures in `/data/mock/`

## Rationale

### Why Vite (Not Next.js)

For a 2-4 hour prototype with no SSR, API routes, or backend needs, Vite is significantly faster:

1. **Instant startup**: <1 second dev server vs Next.js 3-5 seconds
2. **Faster HMR**: Sub-100ms vs Next.js 200-500ms
3. **Simpler mental model**: Just a React app, no App Router/Pages Router confusion
4. **Smaller bundle**: No Next.js framework overhead (~70KB saved)
5. **Zero config**: Works out of the box for our use case

**Trade-off**: We lose SSR, but we don't need it for a prototype that mocks all data client-side.

### Why shadcn/ui

1. **No npm install bloat**: Copy/paste components, modify freely
2. **Production-ready design**: Looks enterprise, not like a prototype
3. **Built on Radix**: Accessible primitives without custom accessibility work
4. **Tailwind-native**: No CSS-in-JS, no additional styling layer

### Why react-player

1. **Universal format support**: MP4, WebM, YouTube URLs
2. **Lightweight**: 20KB gzipped
3. **Controlled API**: Easy to sync with timeline interactions
4. **Production-tested**: 9k+ stars, used by major apps

### Why Recharts

1. **Declarative React API**: Charts as React components
2. **No D3 complexity**: Simpler than raw D3 for basic charts
3. **Built-in responsiveness**: Works on different screen sizes
4. **Customizable**: Can style with Tailwind

### Why jsPDF

1. **Client-side PDF generation**: No server needed
2. **Simple API**: Generate PDF in 10 lines of code
3. **Sufficient for 1-page meeting briefs**: Not building complex reports
4. **Lightweight**: Smaller than react-pdf

### Why React Router (Not TanStack Router)

1. **Proven stability**: Industry standard, 52k+ stars
2. **Simpler for 2-route app**: Home + Analysis page
3. **Faster to implement**: Less learning curve
4. **V6 is modern**: Has all features we need

## Implementation Notes

### Project Structure

```
products/meetingmind/apps/web/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components (copy/paste)
│   │   ├── VideoPlayer.tsx  # react-player wrapper
│   │   ├── EngagementTimeline.tsx  # Recharts timeline
│   │   ├── InsightsPanel.tsx
│   │   └── AnalysisDashboard.tsx
│   ├── data/
│   │   └── mock/            # JSON fixtures
│   │       ├── engagement.json
│   │       ├── transcript.json
│   │       ├── screenshare.json
│   │       └── insights.json
│   ├── lib/
│   │   ├── pdf-export.ts    # jsPDF wrapper
│   │   └── utils.ts         # Utility functions
│   ├── pages/
│   │   ├── Home.tsx         # Upload + demo
│   │   └── Analysis.tsx     # Main dashboard
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── sample-meeting.mp4   # Sample video (or CDN link)
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

### Setup Commands

```bash
# Create Vite React app
npm create vite@latest apps/web -- --template react-ts

# Install dependencies
cd apps/web
npm install react-router-dom react-player recharts jspdf
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Add shadcn/ui (manual copy/paste from shadcn.com)
# Copy: Button, Card, Progress, Tabs components
```

### Key Implementation Points

1. **Mock Data Loading**: Import JSON fixtures directly in components (Vite handles JSON imports)
2. **Video Sync**: Use react-player's `onProgress` callback to sync timeline highlighting
3. **Timeline Interactions**: Click events on Recharts call `player.seekTo(timestamp)`
4. **PDF Export**: jsPDF generates from React state (summary, action items, key moments)
5. **Routing**:
   - `/` - Upload interface + "View Demo" button
   - `/analysis` - Full dashboard with mock data pre-loaded

### Mock Data Strategy

Store realistic meeting scenario data:
- **Meeting**: 18-minute engineering team sync
- **Participants**: 6 engineers (Sarah Chen is lead)
- **Topic**: Q1 API architecture review
- **Key moments**:
  - 2:34 - High engagement discussing GraphQL vs REST
  - 8:12 - Decision made (GraphQL Federation)
  - 12:45 - Confusion spike (body language shows disagreement)
  - 15:23 - Action item assigned to Sarah

### Styling Guidelines

- **Colors**:
  - Engagement high: `bg-green-500`
  - Engagement medium: `bg-yellow-500`
  - Engagement low: `bg-red-500`
- **Typography**: System fonts (no custom fonts for speed)
- **Layout**: Desktop-first (1280px+ optimal)
- **Components**: Use shadcn/ui defaults (minimal customization)

### Performance Targets

- **First load**: <2 seconds
- **Timeline render**: <500ms
- **Video seek**: <200ms
- **PDF generation**: <1 second

All easily achievable with Vite + mock data (no API latency).

## Time Estimate

**Total: 3-4 hours**

Breakdown:
1. **Project setup + Vite config**: 20 min
2. **Mock data creation**: 30 min
3. **Video player + basic timeline**: 45 min
4. **Analysis dashboard (3 streams)**: 60 min
5. **Insights panel + interactivity**: 30 min
6. **PDF export**: 30 min
7. **Polish + Vercel deploy**: 15 min

**Confidence**: High. This stack is optimized for speed, and all libraries are well-documented with simple APIs.

## Alternatives Considered

### Alternative 1: Next.js 14

**Pros**:
- Company standard stack
- Better SEO (irrelevant for prototype)
- Built-in API routes (not needed)

**Cons**:
- Slower dev server (3-5s startup)
- More complex setup (App Router vs Pages Router decision)
- Overhead for features we don't need (SSR, API routes, image optimization)

**Why rejected**: Vite is 3x faster for prototyping when backend isn't needed.

### Alternative 2: Plain HTML + Vanilla JS

**Pros**:
- Absolute fastest setup (no build step)
- Smallest bundle

**Cons**:
- No component reusability
- State management nightmare for timeline sync
- Hard to make look professional
- No TypeScript safety

**Why rejected**: Penny-wise, pound-foolish. Would save 10 minutes setup, cost 60 minutes in debugging.

### Alternative 3: TanStack Router

**Pros**:
- Modern type-safe routing
- Better DevEx for complex routing

**Cons**:
- Newer, less battle-tested
- Overkill for 2 routes
- Adds learning curve

**Why rejected**: React Router v6 is sufficient and familiar.

### Alternative 4: Chart.js

**Pros**:
- Lighter than Recharts (12KB vs 95KB)
- Faster rendering for simple charts

**Cons**:
- Imperative API (harder to integrate with React state)
- More manual work for interactions

**Why rejected**: Recharts declarative API saves more time than Chart.js size advantage.

## References

- [Vite Documentation](https://vitejs.dev/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [react-player GitHub](https://github.com/cookpete/react-player)
- [Recharts Documentation](https://recharts.org/)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [Gemini Live API Docs](https://ai.google.dev/gemini-api/docs/multimodal-live) (for future reference, not used in prototype)
- [OpenRouter Docs](https://openrouter.ai/docs) (for future reference, not used in prototype)

---

**Next Step**: Frontend Engineer uses this ADR to scaffold the Vite project and implement the 5 core features in 3-4 hours.
