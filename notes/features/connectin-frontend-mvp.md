# ConnectIn Frontend MVP Foundation

## Branch
`feature/connectin/frontend-mvp`

## Task
Build the MVP frontend foundation for ConnectIn, an Arabic-first professional networking platform.

## Key Decisions
- Port: 3111 (from PORT-REGISTRY.md)
- Backend API: http://localhost:5007/api/v1
- Next.js 14+ with App Router, TypeScript strict, Tailwind CSS
- shadcn/ui for base components
- react-i18next for Arabic + English
- CSS Logical Properties for RTL support
- IBM Plex Arabic + Inter fonts
- Primary color: #0C9AB8 (teal-500)
- Secondary color: #F5B800 (gold-500)

## Design System Reference
- See: products/connectin/docs/design/DESIGN-SYSTEM.md
- See: products/connectin/docs/design/COMPONENT-SPECS.md
- See: products/connectin/docs/design/WIREFRAMES.md
- See: products/connectin/docs/design/ACCESSIBILITY.md

## Pages to Build
1. Landing page (/)
2. Login (/login)
3. Register (/register)
4. Feed (/feed)
5. Profile (/profile, /profile/[id])
6. Network (/network)
7. Messages (/messages)
8. Jobs (/jobs)
9. Settings (/settings)

## Components to Build
- TopBar, Sidebar, BottomNav, LanguageToggle
- PostCard, PostComposer, FeedLayout
- ProfileCard, ProfileForm
- ConnectionCard, ConnectionList
- Logo, UserAvatar, LoadingSkeleton

## Progress
- [ ] Project initialization (create-next-app)
- [ ] shadcn/ui setup
- [ ] i18n configuration
- [ ] Tailwind design tokens
- [ ] Root layout with RTL support
- [ ] Auth layout + pages
- [ ] Main layout + pages
- [ ] Core components
- [ ] Tests
- [ ] Build verification
