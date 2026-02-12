# Muaththir Arabic Translations

## Feature Summary
Add Arabic translations for milestone definitions, goal templates, and demo observations so the full Muaththir experience is bilingual (English/Arabic).

## Approach
- Nullable Arabic columns alongside English in DB (non-breaking migration)
- API reads `Accept-Language` header, returns Arabic fields when `ar`
- Frontend reads `locale` cookie, sends as `Accept-Language` header
- Fallback to English when Arabic is null

## Schema Changes
- `MilestoneDefinition`: `titleAr`, `descriptionAr`, `guidanceAr`
- `GoalTemplate`: `titleAr`, `descriptionAr`
- `Observation`: `contentAr`

## Key Decisions
- Nullable columns — fallback to English when null
- `Accept-Language` header — standard HTTP, CORS-safelisted
- `Vary: Accept-Language` on cacheable responses
- Emails stay English (separate scope)
- User-created observations stay single-language (contentAr only for demo seed data)

## Progress
- [x] Branch created
- [x] Notes file created
- [ ] Prisma migration
- [ ] Locale utility (TDD)
- [ ] Milestone routes Arabic support (TDD)
- [ ] Goal template & observation routes Arabic (TDD)
- [ ] Seed files Arabic data
- [ ] Frontend API client locale header
- [ ] Full test suite pass + PR
