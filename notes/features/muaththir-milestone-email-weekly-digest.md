# Muaththir: Milestone Email Notifications & Weekly Digest

## Branch
`feature/muaththir/milestone-email-weekly-digest`

## Feature 1: Milestone Achievement Email Notifications
- When PATCH /api/children/:childId/milestones/:milestoneId with achieved=true
- Check parent.milestoneAlerts preference
- If enabled, fire-and-forget email via fastify.email.send()
- HTML template with milestone details

### Test Cases
1. Email sent when milestoneAlerts=true and achieved=true
2. Email NOT sent when milestoneAlerts=false
3. Email NOT sent when achieved=false

## Feature 2: Weekly Digest API Endpoint
- GET /api/digest/weekly
- Authenticated endpoint
- Returns last 7 days summary per child:
  - Observation count
  - Milestones achieved
  - Top dimension score
  - Areas needing attention
- Overall totals

### Test Cases
1. Correct weekly data aggregation
2. Respects parent ownership (only own children)
3. Handles empty data gracefully

## Key Files
- src/routes/milestones.ts - Existing milestone routes (modify)
- src/plugins/email.ts - Email service (read-only)
- src/routes/digest.ts - New file for weekly digest
- src/app.ts - Register new route

## Implementation Notes
- Email is fire-and-forget: use .catch() to swallow errors
- email.send() logs in dev mode (no actual SMTP needed for tests)
- Parent model has: dailyReminder, weeklyDigest, milestoneAlerts (booleans)
