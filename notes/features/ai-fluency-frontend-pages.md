# AI Fluency Frontend Pages - Dynamic Implementation

## Branch: feature/ai-fluency/openrouter-assessments (existing)

## Tasks
1. Update types (add Question, ScenarioOption, LikertScale, etc.)
2. Create AuthContext provider + wrap layout
3. Assessment session page - dynamic with API
4. Assessment complete page - dynamic with API
5. Assessment list page - fix counts, wire start button
6. Dashboard page - dynamic with profile API
7. Profile page - dynamic with radar chart
8. Learning paths page - dynamic
9. Learning path detail - dynamic
10. Org dashboard - sample data charts

## Key Observations
- i18n has old dimension names (conceptual/practical/critical/collaborative) - need to add 4D keys
- Profile page uses t() for dimension labels but keys don't exist yet
- Existing tests mock next/link and next/navigation
- Tests dir: tests/components/ (Header, home, login)
- No test setup for @tanstack/react-query
- ProtectedRoute exists but uses raw useAuth (will conflict with AuthContext)

## API Base
- `http://localhost:5014/api/v1`
- Uses `credentials: 'include'` (httpOnly cookies)
