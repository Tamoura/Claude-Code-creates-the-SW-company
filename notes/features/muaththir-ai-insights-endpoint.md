# Muaththir AI Insights Endpoint

## Feature
GET /api/dashboard/:childId/insights - Rule-based development insights

## Key Design Decisions
- Register as a separate route file (`insights.ts`) under the dashboard prefix
  since it shares the `/api/dashboard` prefix and the same auth/ownership pattern
- Add route registration in `app.ts` under `/api/dashboard` prefix
  OR register within `dashboard.ts` as a sub-plugin -- chose separate file + app.ts
  registration since dashboard.ts is already 274 lines and insights logic is complex
- No external AI API -- pure rule-based analysis
- Reuses calculateDimensionScore pattern from dashboard.ts but with different queries

## Insight Rules Summary
1. **Strengths**: score >= 60 AND >= 3 observations, top 3
2. **Areas for Growth**: score < 40 OR < 2 observations
3. **Recommendations**:
   - observation_gap: 0 obs in last 30 days
   - sentiment_alert: needs_attention > 50%
   - milestone_reminder: > 2 milestones due for age band
   - consistency_praise: all 6 dims have >= 1 obs
   - streak_notice: > 5 obs in last 7 days
4. **Trends**: Compare current vs previous 30-day observation count

## Test Cases
- Mixed observations -> strengths + areas
- No observations -> empty strengths, all areas
- Trends: improving/declining/stable/no_data/needs_attention
- observation_gap recommendations
- milestone_reminder recommendations
- Auth required (401)
- Ownership verified (404 for other parent's child)
- 404 for non-existent child
