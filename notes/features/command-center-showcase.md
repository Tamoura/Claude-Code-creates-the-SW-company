# Command Center Showcase Feature

## Branch: feature/command-center/showcase

## Summary
Add a showcase landing page to Command Center that presents ConnectSW's product portfolio
to three audiences: founders, investors, consumers. Also add presentation mode to doc viewer.

## Components
1. `showcase.json` per product — metadata for showcase display
2. Backend: extend `buildProductInfo()` to read showcase.json
3. Frontend: `/showcase` company-level page with audience filter tabs
4. Frontend: `/showcase/:name` per-product pitch page
5. Frontend: presentation mode toggle in ProductDetail doc viewer
6. Route + nav updates

## Key Decisions
- No new API routes needed — showcase data piggybacks on existing GET /products
- Presentation mode splits markdown by `## ` headings into slides
- Audience filter uses `audiences` array from showcase.json

## Commit Plan
1. `feat(command-center): add showcase metadata for all products`
2. `feat(command-center): add Showcase + ProductShowcase pages`
3. `feat(command-center): add presentation mode to doc viewer`
