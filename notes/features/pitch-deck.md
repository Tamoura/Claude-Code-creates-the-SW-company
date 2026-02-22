# Pitch Deck Feature

## Branch
`feature/command-center/showcase` (extending existing showcase work)

## Summary
Add pitch deck presentation mode to Command Center's Showcase pages. Each product gets a full-screen, keyboard-navigable pitch deck with audience filtering.

## Commit Plan
1. `feat(command-center): add pitch deck backend service + route`
2. `feat(command-center): add pitch-deck.json for all products`
3. `feat(command-center): add PitchDeck page + slide templates`
4. `feat(command-center): integrate pitch deck into showcase pages`

## Slide Layouts (10 types)
- title, problem, solution, market, feature-grid, traction, business-model, competitive, metrics, vision

## Key Decisions
- Pitch deck data stored as `products/<name>/pitch-deck.json`
- Backend reads from filesystem (consistent with existing products.service.ts pattern)
- Frontend uses full-screen overlay with keyboard navigation
- 3 component files for slides: ContentSlides, DataSlides, GridSlides
