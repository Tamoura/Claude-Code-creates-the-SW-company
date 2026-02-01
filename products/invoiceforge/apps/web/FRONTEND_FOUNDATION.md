# InvoiceForge Frontend Foundation

## Overview
Next.js 14 frontend application for InvoiceForge - an AI invoice generator for freelancers.

**Dev Server**: http://localhost:3109
**Build Status**: ✅ Successful

## Technology Stack
- Next.js 14.2.35
- React 18
- TypeScript 5
- Tailwind CSS 3.4.1
- App Router (not Pages Router)
- Lucide React (icons)
- Class Variance Authority (component variants)

## Project Structure

```
src/
├── app/
│   ├── (marketing)/          # Marketing site routes
│   │   ├── layout.tsx        # Header + Footer
│   │   ├── page.tsx          # Landing page
│   │   ├── pricing/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/          # Dashboard routes
│   │   ├── layout.tsx        # Sidebar + Top bar
│   │   └── dashboard/
│   │       ├── page.tsx      # Dashboard home
│   │       ├── invoices/
│   │       ├── clients/
│   │       └── settings/
│   ├── layout.tsx            # Root layout
│   ├── not-found.tsx         # 404 page
│   └── error.tsx             # Error boundary
├── components/               # Reusable components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Logo.tsx
│   └── Badge.tsx
└── lib/
    ├── utils.ts              # cn() helper
    └── api.ts                # API client

```

## Components Built

### Reusable Components
- **Button**: 4 variants (primary, secondary, outline, ghost), 3 sizes
- **Card**: Card container with Header, Title, Description, Content, Footer
- **Input**: Form input with label and error state
- **Logo**: InvoiceForge text logo with icon
- **Badge**: Status badges (draft, sent, paid, overdue)

### Marketing Pages
- **Landing Page** (`/`)
  - Hero section with CTA
  - Feature highlights (3 cards)
  - Social proof testimonials
  - Secondary CTA
- **Pricing Page** (`/pricing`)
  - 3 pricing tiers (Free, Pro, Team)
  - Feature comparison table
- **Login Page** (`/login`)
  - Email/password form
  - Google OAuth button placeholder
- **Signup Page** (`/signup`)
  - Name, email, password form
  - Google OAuth button placeholder

### Dashboard Pages
- **Dashboard Home** (`/dashboard`)
  - Stats cards (invoices, revenue, clients, pending)
  - Recent invoices list
  - Quick actions
- **Invoices** (`/dashboard/invoices`)
  - Invoice list table
  - Search/filter placeholder
- **New Invoice** (`/dashboard/invoices/new`)
  - AI generator placeholder (main feature to be built)
  - Manual form placeholder
- **Clients** (`/dashboard/clients`)
  - Coming soon placeholder
- **Settings** (`/dashboard/settings`)
  - Profile info form (disabled)
  - Invoice settings placeholder
  - Billing info

## Design System

### Colors
- **Primary**: Indigo 600 (brand color)
- **Secondary**: Gray 600
- **Success**: Green
- **Warning**: Yellow
- **Error**: Red

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, various sizes
- **Body**: Regular, 14-16px

### Spacing
- Uses Tailwind's default spacing scale
- Consistent padding/margins throughout

## Features

### Implemented
- ✅ Responsive design (mobile-first)
- ✅ App Router with route groups
- ✅ Marketing layout with header/footer
- ✅ Dashboard layout with sidebar/topbar
- ✅ Component library with CVA variants
- ✅ TypeScript throughout
- ✅ Tailwind CSS styling
- ✅ Error pages (404, error boundary)
- ✅ Accessible markup (semantic HTML, ARIA)

### Placeholders (Ready for Backend Integration)
- AI invoice generation (main feature)
- Authentication (login/signup/logout)
- Client management
- Invoice CRUD operations
- Settings/profile updates
- Stripe payment integration

## Running the Application

### Development
```bash
npm run dev
# Runs on http://localhost:3109
```

### Build
```bash
npm run build
# Creates production build
```

### Production
```bash
npm start
# Runs production server
```

## Environment Variables
See `.env.example`:
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:5004)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe key (for future payment integration)

## Next Steps
1. Backend API integration (connect to port 5004)
2. Authentication flow implementation
3. AI invoice generation feature
4. Stripe payment links
5. PDF export
6. E2E tests with Playwright (QA-01)

## Notes
- All pages render without errors
- Build succeeds with only console.log warnings (expected for placeholder TODOs)
- Port 3109 confirmed working
- No API calls yet - using placeholder/static data
- Mobile-responsive throughout
- Professional UI with indigo/blue color scheme
