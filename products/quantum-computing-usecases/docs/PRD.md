# Product Requirements Document (PRD)

## Quantum Computing Use Cases Platform

| Field | Value |
|-------|-------|
| **Product Name** | Quantum Computing Use Cases Platform |
| **Version** | 0.1.0 (Prototype) |
| **Status** | Prototype Complete |
| **Owner** | ConnectSW Product Team |
| **Created** | 2026-02-16 |
| **Last Updated** | 2026-02-16 |

---

## 1. Overview

### 1.1 Product Vision

The Quantum Computing Use Cases Platform is a static web application that helps business analysts and technical leads discover, evaluate, and compare practical quantum computing applications relevant to their industry. It translates complex quantum computing research into actionable business intelligence for decision-makers evaluating quantum technology investments.

### 1.2 Problem Statement

Developers, researchers, and business leaders struggle to understand practical quantum computing applications relevant to their industry. Most quantum computing resources focus on theory or highly technical implementations, creating a gap for those seeking to evaluate real-world use cases and feasibility. Decision-makers need a curated, business-oriented resource that clearly communicates what quantum computing can do today, what is coming soon, and what remains theoretical.

### 1.3 Product Summary

A frontend-only static web application built with Vite + React + TypeScript + Tailwind CSS. It provides:

- A catalog of 10 quantum computing use cases organized by industry, problem type, and maturity level
- Detailed use case pages with quantum advantage explanations, timelines, technical requirements, and real-world examples
- Side-by-side comparison of up to 3 use cases
- A curated learning path progressing from beginner to advanced
- A Quantum Sovereignty in the Arab World editorial feature
- Bilingual support (English and Arabic) with RTL layout
- Zero backend dependency -- all data stored in static JSON

### 1.4 Success Criteria

| Criterion | Measurable Target |
|-----------|-------------------|
| Clarity | Non-quantum experts can understand what each use case does and why it matters within 60 seconds of reading |
| Discovery | Users can find relevant use cases for their industry in under 2 minutes |
| Decision Support | Users can compare 2-3 use cases and assess production-readiness using the comparison table |
| Engagement | Average session time exceeds 3 minutes |
| Technical Accuracy | All use case content validated against current quantum computing research (see FACTCHECK docs) |
| Performance | Initial page load under 2 seconds on 3G; route transitions under 100ms; search/filter under 200ms |
| Bundle Size | JavaScript bundle under 300KB; total assets under 500KB |

---

## 2. Personas

### 2.1 Business Analyst (Primary)

| Attribute | Detail |
|-----------|--------|
| **Role** | Strategic analyst at a mid-to-large company |
| **Goal** | Evaluate quantum computing potential for business problems (optimization, cryptography, simulation) |
| **Pain Point** | Overwhelmed by academic papers and unclear which use cases are production-ready vs. theoretical |
| **Context** | Preparing reports or recommendations for leadership on quantum investment |
| **Key Need** | Plain-language explanations, maturity assessment, industry relevance filtering |

### 2.2 Technical Lead

| Attribute | Detail |
|-----------|--------|
| **Role** | Engineering or R&D lead evaluating emerging technologies |
| **Goal** | Assess technical feasibility of quantum computing for specific domain problems |
| **Pain Point** | Difficulty translating quantum research papers into practical engineering requirements |
| **Context** | Building a technology roadmap or proof-of-concept proposal |
| **Key Need** | Technical requirements (qubits, gate depth, error rates), timeline projections, real-world examples |

### 2.3 CTO / VP Engineering

| Attribute | Detail |
|-----------|--------|
| **Role** | Senior technology executive at a company considering quantum investment |
| **Goal** | Make informed buy/build/wait decisions for quantum technology adoption |
| **Pain Point** | Needs concise, high-level comparisons across multiple use cases without deep-diving into each |
| **Context** | Board presentations, strategic planning sessions, budget allocation |
| **Key Need** | Comparison view, maturity badges, timeline overview, industry categorization |

### 2.4 Researcher / Academic

| Attribute | Detail |
|-----------|--------|
| **Role** | Quantum computing researcher or graduate student |
| **Goal** | Understand the application landscape and identify commercially relevant research directions |
| **Pain Point** | Research is often disconnected from industry needs |
| **Context** | Literature review, grant proposal writing, industry partnership scouting |
| **Key Need** | Comprehensive technical requirements, curated references, learning path progression |

---

## 3. Features

### 3.1 MVP Features (Implemented)

#### F-01: Landing Page (Home)

**Route**: `/`

**User Story**: As a visitor, I want to see an overview of the platform and featured use cases so that I can quickly understand the platform's value and start exploring.

**Implementation**:
- Hero section with gradient background, headline ("Discover Practical Quantum Computing Use Cases"), subtitle, and CTA button linking to `/use-cases`
- Featured use cases section showing the first 3 use cases as `UseCaseCard` components in a 3-column responsive grid
- "View all N use cases" link with dynamic count
- Platform value proposition section with 3 feature cards: Discover, Compare, Learn

**Acceptance Criteria**:
- Given a user lands on `/`, when the page loads, then they see a hero section with a CTA button
- Given the page is loaded, when the user views the featured section, then exactly 3 use case cards are displayed
- Given the user clicks "Browse Use Cases", when the navigation occurs, then they are taken to `/use-cases`

---

#### F-02: Use Case Directory

**Route**: `/use-cases`

**User Story**: As a business analyst, I want to browse all quantum computing use cases with filters so that I can find applications relevant to my industry and assess their readiness.

**Implementation**:
- Page header with title and subtitle showing total use case count
- 4-column layout: 1 column for FilterPanel, 3 columns for use case grid
- `FilterPanel` component with:
  - Text search input (searches title, shortDescription, and fullDescription)
  - Industry multi-select checkboxes (8 industries)
  - Problem Type multi-select checkboxes (4 types)
  - Maturity Level multi-select checkboxes (4 levels)
- Results counter showing "Showing X of Y use cases"
- Empty state message when no use cases match filters
- Use cases displayed as `UseCaseCard` components in a 2-column grid

**Filtering Logic**:
- Filters are AND-combined across categories (industry AND problem type AND maturity)
- Within a category, selections are OR-combined (finance OR logistics)
- Search query matches against title, shortDescription, and fullDescription (case-insensitive)
- All filters apply in real-time via `useMemo`

**Acceptance Criteria**:
- Given a user is on `/use-cases`, when no filters are selected, then all 10 use cases are displayed
- Given a user selects "Finance" industry filter, when the filter applies, then only use cases with "finance" in their industry array are shown
- Given a user types "drug" in search, when the query applies, then only use cases matching "drug" in title or description are shown
- Given a user selects multiple filters, when filters combine, then results match ALL selected filter categories

---

#### F-03: Use Case Detail Page

**Route**: `/use-cases/:slug`

**User Story**: As a technical lead, I want to see detailed information about a specific quantum computing use case so that I can assess its technical feasibility and business value.

**Implementation**:
- Back navigation link to `/use-cases`
- Header with maturity badge, problem type badge, title, and short description
- Overview card: full description and industry badges
- Quantum Advantage card: explanation of why quantum outperforms classical
- Timeline & Maturity card: current status, near-term (1-3 years), long-term (5+ years)
- Technical Requirements card: 2x2 grid showing qubits, gate depth, error rate, coherence time
- Real-World Examples card: company name, description, optional external link
- Related Use Cases section: `UseCaseCard` components for linked use cases
- 404 handling: if slug does not match any use case, display "Use Case Not Found" with link to browse all

**Acceptance Criteria**:
- Given a user navigates to `/use-cases/drug-discovery-simulation`, when the page loads, then the full detail page for Drug Discovery is rendered with all sections
- Given a use case has related use cases, when the page loads, then related use case cards are displayed at the bottom
- Given an invalid slug, when the page loads, then a "Use Case Not Found" message is displayed with a link back to the directory

---

#### F-04: Comparison View

**Route**: `/compare`

**User Story**: As a CTO, I want to compare up to 3 quantum computing use cases side-by-side so that I can evaluate which is most relevant and feasible for my organization.

**Implementation**:
- Page header with selection counter (X/3 selected)
- Comparison table (visible when 1+ use cases selected):
  - Columns: one per selected use case
  - Rows: Maturity Level (with badges), Industries (with badges), Qubits Required, Gate Depth, Error Rate, Current Status
  - Alternating row backgrounds for readability
- Empty state card when no use cases selected
- All use cases displayed below as selectable `UseCaseCard` components with Select/Selected toggle
- Selection state persisted in URL query params (`?ids=1,2,3`) for shareable comparisons
- Maximum 3 selections enforced (select button becomes no-op at limit)

**Acceptance Criteria**:
- Given a user is on `/compare`, when no use cases are selected, then an empty state message is shown
- Given a user selects 2 use cases, when the comparison table renders, then 2 columns of data appear with all comparison criteria
- Given a user selects 3 use cases and tries to select a 4th, when they click select, then nothing happens (max 3 enforced)
- Given a user shares the URL `?ids=1,2,3`, when another user opens it, then those 3 use cases are pre-selected and compared

---

#### F-05: Learning Path

**Route**: `/learning-path`

**User Story**: As a researcher new to quantum computing applications, I want to follow a curated progression of use cases so that I can build my understanding from fundamentals to advanced applications.

**Implementation**:
- Page header with title and description
- Three progressive stages, each with a numbered circle indicator:
  - **Stage 1 -- Beginner**: Post-Quantum Cryptography, Portfolio Optimization, Traffic Flow Optimization (IDs: 5, 2, 7) -- use cases with clear business value approaching production
  - **Stage 2 -- Intermediate**: Drug Discovery, Materials Discovery, Supply Chain Optimization (IDs: 1, 4, 3) -- simulation use cases that are experimental
  - **Stage 3 -- Advanced**: Quantum Machine Learning, Climate Modeling, Protein Folding (IDs: 6, 8, 10) -- theoretical applications requiring fault-tolerant computers
- Each use case shown as a `Card` with step number (e.g., Step 1.1), maturity badge, title, short description, and "Learn more" link to detail page
- Explanatory card at the bottom ("Why This Order?") with rationale for the learning progression

**Acceptance Criteria**:
- Given a user visits `/learning-path`, when the page loads, then 3 stages are displayed with 3 use cases each (9 total)
- Given a user clicks "Learn more" on a use case, when navigation occurs, then they are taken to the corresponding detail page
- Given the learning path is displayed, when viewing stage order, then beginner use cases are pre-production/production-ready, intermediate are experimental, and advanced are theoretical

---

#### F-06: Quantum Sovereignty in the Arab World

**Route**: `/quantum-sovereignty-arab-world`

**User Story**: As a stakeholder in the Arab region, I want to understand the strategic importance of quantum computing independence so that I can advocate for quantum investment and regional collaboration.

**Implementation**:
- Hero section with title and subtitle
- Section 1 -- Why Quantum Sovereignty Matters: 4 cards (National Security, Economic Impact, Technology Independence, Strategic Positioning) with inline citations
- Section 2 -- Current State in Arab Nations: 4 country cards (UAE, Saudi Arabia, Egypt, Qatar) with flag-colored identifiers and citations; regional collaboration summary card
- Section 3 -- Key Investment Areas: 5 icon cards (Quantum Infrastructure, Quantum Cryptography, Quantum Sensors, Education & Talent, Research Hubs)
- Section 4 -- Strategic Use Cases: 5 cards (Oil & Gas Optimization, Financial Services & Islamic Banking, Smart City Infrastructure, Climate Adaptation, Supply Chain Sovereignty) with citations
- Section 5 -- Challenges & Opportunities: 6 cards in challenge/opportunity pairs (Technology Access, Talent Development, Regional Coordination)
- Section 6 -- Roadmap: 3 timeline cards (Near-Term 1-3Y, Medium-Term 3-5Y, Long-Term 5-10Y) with bulleted action items
- Call to Action: gradient card with motivational message
- References section: 21 fact-checked citations using `References` and `Citation` components

**Acceptance Criteria**:
- Given a user visits `/quantum-sovereignty-arab-world`, when the page loads, then all 6 content sections plus CTA and references are rendered
- Given the page contains citations, when a user clicks a citation number, then the page scrolls to the corresponding reference in the References section
- Given the page is viewed in Arabic, when the language is switched, then all content renders in Arabic with RTL layout

---

#### F-07: Internationalization (i18n)

**User Story**: As an Arabic-speaking user, I want to view the platform in Arabic so that I can understand the content in my native language.

**Implementation**:
- `react-i18next` with `i18next-browser-languagedetector` for automatic language detection
- Two locale files: `en.json` (English) and `ar.json` (Arabic)
- `LanguageSwitcher` dropdown component in the header
- RTL support: `document.documentElement.dir` updates dynamically on language change
- Language preference persisted in `localStorage`
- Fallback language: English

**Supported Languages**:
| Code | Language | Direction | Status |
|------|----------|-----------|--------|
| `en` | English | LTR | Complete |
| `ar` | Arabic | RTL | Complete |

**Acceptance Criteria**:
- Given a user clicks the language switcher, when they select Arabic, then all translatable text renders in Arabic
- Given Arabic is selected, when the layout renders, then `dir="rtl"` is set on the HTML element
- Given a user selects a language, when they reload the page, then the selected language persists

---

#### F-08: Responsive Layout

**User Story**: As a mobile user, I want the platform to work on my phone so that I can reference quantum computing use cases during meetings or on the go.

**Implementation**:
- `Layout` component wrapping all routes with consistent header, main content area, and footer
- Header: logo/title (left), navigation links + language switcher (right)
- Active route indication: blue text + bottom border on current nav link
- Footer: copyright text centered
- Responsive breakpoints: single column on mobile, multi-column on tablet/desktop
- Tailwind responsive prefixes: `sm:`, `md:`, `lg:` used throughout

**Acceptance Criteria**:
- Given a user views the site on a mobile device (< 640px), when any page loads, then content stacks vertically without horizontal scrolling
- Given a user views the site on desktop (> 1024px), when the use case directory loads, then the filter panel and use case grid display side-by-side

---

### 3.2 Reusable Component Library (Implemented)

| Component | Location | Purpose |
|-----------|----------|---------|
| `Badge` | `components/ui/Badge.tsx` | Colored label with variants: default (gray), success (green), warning (yellow), info (blue), danger (red) |
| `Card` | `components/ui/Card.tsx` | White container with rounded corners, shadow, border, and padding. Accepts custom `className` |
| `UseCaseCard` | `components/use-cases/UseCaseCard.tsx` | Card displaying use case title, short description, maturity badge, industry badges. Optional select/deselect for comparison mode |
| `FilterPanel` | `components/use-cases/FilterPanel.tsx` | Sidebar with search input, industry checkboxes, problem type checkboxes, maturity level checkboxes |
| `Layout` | `components/layout/Layout.tsx` | App shell with header navigation, main content area, and footer |
| `LanguageSwitcher` | `components/ui/LanguageSwitcher.tsx` | Dropdown to toggle between English and Arabic |
| `Citation` | `components/references/Citation.tsx` | Superscript inline citation linking to reference by ID |
| `References` | `components/references/References.tsx` | Numbered reference list with author, title, source, URL, and access date |

---

### 3.3 Phase 2 Features (Planned)

#### F-09: Interactive Quantum Circuit Simulator

**User Story**: As a technical lead, I want to interact with simplified quantum circuit visualizations so that I can understand the computational requirements of each use case.

**Requirements**:
- Visual circuit builder with drag-and-drop gates (H, CNOT, X, Z, Measurement)
- Pre-loaded circuits for each use case showing the algorithmic approach
- Real-time state vector visualization
- Qubit count and gate depth counter
- Export circuit as image or JSON

---

#### F-10: Community Contributions

**User Story**: As a quantum computing practitioner, I want to submit new use cases and corrections so that the platform stays current and accurate.

**Requirements**:
- User registration and authentication (OAuth with GitHub, Google)
- Use case submission form with Zod validation
- Moderation queue for submitted use cases
- Upvoting and commenting on existing use cases
- Contributor profiles and reputation system

---

#### F-11: Public API

**User Story**: As a developer, I want to access use case data programmatically so that I can integrate quantum computing insights into my own applications.

**Requirements**:
- RESTful API with OpenAPI/Swagger documentation
- Endpoints: `GET /api/use-cases`, `GET /api/use-cases/:slug`, `GET /api/industries`, `GET /api/learning-paths`
- Rate limiting (100 requests/minute for free tier)
- API key authentication
- JSON response format matching current data schema

---

#### F-12: Personalization & Saved Views

**User Story**: As a returning user, I want to save my favorite use cases and comparison sets so that I can revisit them without re-selecting each time.

**Requirements**:
- User accounts (email or OAuth)
- Save/bookmark individual use cases
- Save comparison sets with custom names
- Dashboard showing saved items and recent activity
- Email notifications for updates to saved use cases

---

#### F-13: Advanced Search & Analytics

**User Story**: As a business analyst, I want advanced search with faceted results and analytics so that I can discover patterns across the use case catalog.

**Requirements**:
- Full-text search with relevance ranking
- Faceted search results with counts per filter category
- Industry heat map showing use case density by industry and maturity
- Maturity timeline visualization
- Qubit requirements scatter plot across use cases

---

#### F-14: Content Expansion

**User Story**: As a platform user, I want access to a comprehensive catalog of 50+ use cases so that I can find niche applications relevant to my specific domain.

**Requirements**:
- Expand catalog from 10 to 50+ use cases
- Add new industries: Healthcare, Telecommunications, Aerospace, Agriculture, Energy
- Add new problem types: Error Correction, Quantum Sensing, Quantum Communication
- Add case study deep-dives with ROI analysis
- Partner with quantum companies for verified case studies

---

### 3.4 Future Features (Aspirational)

| Feature | Description |
|---------|-------------|
| Quantum Readiness Assessment | Interactive quiz that evaluates an organization's readiness for quantum adoption based on use case requirements |
| Implementation Guides | Step-by-step technical guides with code samples for each use case |
| Vendor Comparison | Compare quantum hardware vendors (IBM, Google, IonQ, Rigetti) against use case requirements |
| Newsletter / Alerts | Email notifications when use case maturity levels change or new use cases are added |
| Quantum Cost Calculator | Estimate cloud quantum computing costs for running specific algorithms |
| Multi-language Expansion | Add French, Mandarin, Hindi, Spanish translations |

---

## 4. Use Case Taxonomy

### 4.1 Industries

| Industry Slug | Display Name | Description | Use Case Count |
|---------------|-------------|-------------|----------------|
| `finance` | Finance | Trading, risk analysis, portfolio optimization, derivatives pricing | 2 |
| `pharmaceuticals` | Pharmaceuticals | Drug discovery, molecular simulation, protein folding | 2 |
| `logistics` | Logistics | Supply chain, routing, traffic flow, scheduling | 2 |
| `materials-science` | Materials Science | New materials discovery, property prediction, catalyst design | 1 |
| `ai-ml` | AI/ML | Quantum machine learning, pattern recognition, classification | 1 |
| `security` | Security | Post-quantum cryptography, encryption, key distribution | 1 |
| `environmental` | Environmental | Climate modeling, weather prediction, sustainability | 1 |
| `chemistry` | Chemistry | Molecular simulation, chemical reactions, atomic modeling | 3 (shared with pharma/materials) |

### 4.2 Problem Types

| Problem Type Slug | Display Name | Description | Use Case Count |
|-------------------|-------------|-------------|----------------|
| `optimization` | Optimization | Finding optimal solutions in large combinatorial spaces (NP-hard problems) | 3 |
| `simulation` | Simulation | Modeling quantum mechanical processes at atomic/molecular level | 5 |
| `machine-learning` | Machine Learning | Quantum algorithms for classification, clustering, pattern recognition | 1 |
| `cryptography` | Cryptography | Quantum-resistant encryption and post-quantum security standards | 1 |

### 4.3 Maturity Levels

| Maturity Level Slug | Display Name | Badge Variant | Description | Use Case Count |
|---------------------|-------------|---------------|-------------|----------------|
| `theoretical` | Theoretical | `default` (gray) | Research phase, no working implementations | 3 |
| `experimental` | Experimental | `info` (blue) | Lab demonstrations, proof-of-concept | 4 |
| `pre-production` | Pre-Production | `warning` (yellow) | Advanced testing, limited deployments | 2 |
| `production-ready` | Production Ready | `success` (green) | Available quantum computers can run this use case | 1 |

---

## 5. Use Case Catalog (Implemented Data)

| ID | Slug | Title | Industry | Problem Type | Maturity | Qubits |
|----|------|-------|----------|-------------|----------|--------|
| 1 | `drug-discovery-simulation` | Drug Discovery & Molecular Simulation | Pharma, Chemistry | Simulation | Experimental | 100 |
| 2 | `portfolio-optimization` | Financial Portfolio Optimization | Finance | Optimization | Pre-Production | 200 |
| 3 | `supply-chain-optimization` | Supply Chain & Logistics Optimization | Logistics | Optimization | Experimental | 300 |
| 4 | `materials-discovery` | Advanced Materials Discovery | Materials Science, Chemistry | Simulation | Experimental | 150 |
| 5 | `post-quantum-cryptography` | Post-Quantum Cryptography | Security | Cryptography | Pre-Production | 0 |
| 6 | `quantum-machine-learning` | Quantum Machine Learning | AI/ML | Machine Learning | Theoretical | 500 |
| 7 | `traffic-flow-optimization` | Traffic Flow & Urban Mobility Optimization | Logistics | Optimization | Experimental | 250 |
| 8 | `climate-modeling` | Climate & Weather Modeling | Environmental | Simulation | Theoretical | 1000 |
| 9 | `financial-risk-modeling` | Financial Risk Analysis & Monte Carlo Simulation | Finance | Simulation | Experimental | 180 |
| 10 | `protein-folding` | Protein Folding Prediction | Pharma, Chemistry | Simulation | Theoretical | 800 |

### 5.1 Use Case Data Schema

Each use case record contains the following fields validated by Zod at runtime:

```typescript
interface UseCase {
  id: string;
  slug: string;                    // URL-friendly identifier
  title: string;                   // Display title
  shortDescription: string;        // One-liner for card view
  fullDescription: string;         // Detailed description for detail page
  industry: Industry[];            // One or more industry tags
  problemType: ProblemType;        // Primary problem category
  maturityLevel: MaturityLevel;    // Current readiness status
  quantumAdvantage: string;        // Why quantum vs. classical
  timeline: {
    current: string;               // What is happening now
    nearTerm: string;              // 1-3 years outlook
    longTerm: string;              // 5+ years outlook
  };
  requirements: {
    qubits: number;                // Minimum qubit count needed
    gateDepth: number;             // Circuit depth estimate
    errorRate: number;             // Required error rate threshold
    coherenceTime: string;         // T1/T2 requirements
  };
  examples: {
    company: string;               // Organization name
    description: string;           // What they are doing
    link?: string;                 // Optional reference URL
  }[];
  relatedUseCases: string[];       // IDs of related use cases
  lastUpdated: string;             // ISO date string
}
```

---

## 6. Site Map

| Route | Page | Status | Purpose | Key Elements |
|-------|------|--------|---------|-------------|
| `/` | Home | Implemented | Landing page and entry point | Hero section, 3 featured use cases, 3 value prop cards, CTA |
| `/use-cases` | Use Case Directory | Implemented | Browse and filter all use cases | FilterPanel (search, industry, problem type, maturity), UseCaseCard grid, result counter |
| `/use-cases/:slug` | Use Case Detail | Implemented | Deep-dive into a single use case | Overview, quantum advantage, timeline, technical requirements, examples, related use cases |
| `/compare` | Comparison View | Implemented | Side-by-side comparison of up to 3 use cases | Comparison table, selectable use case cards, URL-persisted selection |
| `/learning-path` | Learning Path | Implemented | Curated beginner-to-advanced progression | 3 stages (Beginner/Intermediate/Advanced), 9 use cases, rationale explanation |
| `/quantum-sovereignty-arab-world` | Quantum Sovereignty | Implemented | Editorial feature on Arab quantum strategy | 6 content sections, 21 references, country profiles, roadmap, CTA |
| `/about` | About | Planned (Phase 2) | Platform background and team information | -- |

---

## 7. User Flows

### 7.1 Discovery Flow

```
User lands on / (Home)
  -> Sees hero and featured use cases
  -> Clicks "Browse Use Cases" CTA
  -> Arrives at /use-cases
  -> Applies industry filter (e.g., "Finance")
  -> Sees 2 matching use cases
  -> Clicks on "Financial Portfolio Optimization" card
  -> Reads detail page at /use-cases/portfolio-optimization
  -> Scrolls to "Related Use Cases"
  -> Clicks on "Supply Chain & Logistics Optimization"
  -> Continues exploring related use cases
```

### 7.2 Comparison Flow

```
User navigates to /compare
  -> Sees empty state ("Select use cases below")
  -> Scrolls to "All Use Cases" section
  -> Clicks "Select" on 3 use cases
  -> Comparison table populates with 3 columns
  -> Reviews maturity, qubits, gate depth, error rate, current status
  -> Copies URL (?ids=1,2,3) to share with colleague
  -> Colleague opens URL and sees same comparison pre-loaded
```

### 7.3 Learning Flow

```
User navigates to /learning-path
  -> Sees Stage 1 (Beginner) with 3 use cases
  -> Clicks "Learn more" on "Post-Quantum Cryptography"
  -> Reads detail page
  -> Returns to /learning-path
  -> Progresses to Stage 2 (Intermediate)
  -> Explores Drug Discovery detail page
  -> Returns and continues to Stage 3 (Advanced)
```

### 7.4 Language Switch Flow

```
User (Arabic speaker) lands on / in English
  -> Clicks language switcher in header
  -> Selects "العربية" (Arabic)
  -> All UI text switches to Arabic
  -> Layout direction changes to RTL
  -> User navigates to /quantum-sovereignty-arab-world
  -> Reads full sovereignty article in Arabic
  -> Closes browser
  -> Returns later -- Arabic language preference persisted via localStorage
```

---

## 8. Requirements

### 8.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Display a catalog of quantum computing use cases with title, description, industry, problem type, and maturity level | P0 | Done |
| FR-02 | Filter use cases by industry (multi-select, OR within category) | P0 | Done |
| FR-03 | Filter use cases by problem type (multi-select, OR within category) | P0 | Done |
| FR-04 | Filter use cases by maturity level (multi-select, OR within category) | P0 | Done |
| FR-05 | Search use cases by keyword (matches title, shortDescription, fullDescription) | P0 | Done |
| FR-06 | Combine filters with AND logic across categories | P0 | Done |
| FR-07 | Display detailed information for each use case at a unique URL | P0 | Done |
| FR-08 | Show quantum advantage explanation on detail pages | P0 | Done |
| FR-09 | Show timeline (current, near-term, long-term) on detail pages | P0 | Done |
| FR-10 | Show technical requirements (qubits, gate depth, error rate, coherence time) on detail pages | P0 | Done |
| FR-11 | Show real-world examples with company names and descriptions on detail pages | P0 | Done |
| FR-12 | Show related use cases with navigation links on detail pages | P0 | Done |
| FR-13 | Compare up to 3 use cases side-by-side in a table | P0 | Done |
| FR-14 | Persist comparison selection in URL query parameters for shareability | P0 | Done |
| FR-15 | Enforce maximum of 3 selections in comparison mode | P0 | Done |
| FR-16 | Display a curated learning path with 3 progressive stages | P1 | Done |
| FR-17 | Validate all use case data against Zod schema on initialization | P1 | Done |
| FR-18 | Support English and Arabic languages with dynamic switching | P1 | Done |
| FR-19 | Support RTL layout for Arabic language | P1 | Done |
| FR-20 | Persist language preference in localStorage | P1 | Done |
| FR-21 | Display Quantum Sovereignty editorial with fact-checked references | P2 | Done |
| FR-22 | Handle invalid use case slugs with 404 message and navigation link | P1 | Done |
| FR-23 | Display featured use cases (first 3) on landing page | P1 | Done |

### 8.2 Non-Functional Requirements

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-01 | Initial page load time | < 2 seconds on 3G connection | Target set |
| NFR-02 | Route transition time | < 100ms | Target set |
| NFR-03 | Search/filter response time | < 200ms | Achieved (client-side `useMemo`) |
| NFR-04 | JavaScript bundle size | < 300KB | Target set |
| NFR-05 | Total asset size (JS + CSS + images) | < 500KB | Target set |
| NFR-06 | Browser support | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ | Target set |
| NFR-07 | Mobile responsiveness | Fully functional on 320px+ screen widths | Implemented |
| NFR-08 | Accessibility | Semantic HTML, proper heading hierarchy, ARIA labels on interactive elements | Partially implemented |
| NFR-09 | SEO readiness | Semantic HTML, proper heading hierarchy, meta tags (requires SSR for full SEO) | Partially implemented (client-side rendered) |
| NFR-10 | Code splitting | Lazy-loaded route components via React Router | Not yet implemented |
| NFR-11 | Zero runtime errors | Zod validation catches data issues at startup | Implemented |

---

## 9. Technical Architecture

### 9.1 Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Build Tool | Vite | 5.0+ | Sub-second dev server, optimized for prototyping |
| UI Framework | React | 18.2+ | Component reusability, large ecosystem |
| Language | TypeScript | 5.3+ | Type safety, developer experience |
| Routing | React Router | 6.21+ | Client-side routing, dynamic route params |
| Styling | Tailwind CSS | 3.4+ | Utility-first, rapid UI development |
| Data Validation | Zod | 3.22+ | Runtime schema validation for JSON data |
| i18n | react-i18next | 16.5+ | React-native internationalization with language detection |
| Testing | Vitest + React Testing Library | 1.1+ / 14.1+ | Vite-native testing, Jest-compatible API |
| DOM Simulation | happy-dom | 12.10+ | Lightweight DOM for test environment |

### 9.2 Data Architecture

```
Static JSON (use-cases.json)
  -> Imported at build time (static import)
  -> Validated with Zod schema on app initialization (useUseCases hook)
  -> Passed to components via props (max 2 levels of prop drilling)
  -> Filtered/sorted via utility functions (filters.ts)
  -> Comparison state stored in URL search params
  -> Language preference stored in localStorage
```

### 9.3 State Management

| State Type | Mechanism | Example |
|-----------|-----------|---------|
| URL State | `useSearchParams` | Comparison selection (`?ids=1,2,3`) |
| Component State | `useState` | Filter selections, search query, dropdown open/closed |
| Derived State | `useMemo` | Filtered use cases, validated data |
| Persisted State | `localStorage` | Language preference |

### 9.4 File Structure

```
src/
├── App.tsx                        # Route definitions
├── main.tsx                       # React root, BrowserRouter, i18n init
├── index.css                      # Tailwind imports, global styles
├── components/
│   ├── layout/
│   │   └── Layout.tsx             # App shell (header, nav, footer)
│   ├── use-cases/
│   │   ├── UseCaseCard.tsx        # Card with maturity badge, title, description
│   │   ├── UseCaseCard.test.tsx   # Unit tests
│   │   └── FilterPanel.tsx        # Search + filter sidebar
│   ├── references/
│   │   ├── Citation.tsx           # Inline superscript citation
│   │   ├── Citation.test.tsx      # Unit tests
│   │   ├── References.tsx         # Numbered reference list
│   │   └── References.test.tsx    # Unit tests
│   └── ui/
│       ├── Badge.tsx              # Colored label component
│       ├── Badge.test.tsx         # Unit tests
│       ├── Card.tsx               # Container component
│       ├── LanguageSwitcher.tsx   # Language dropdown
│       └── LanguageSwitcher.test.tsx # Unit tests
├── pages/
│   ├── Home.tsx                   # Landing page
│   ├── UseCases.tsx               # Directory with filters
│   ├── UseCaseDetail.tsx          # Individual use case page
│   ├── Compare.tsx                # Side-by-side comparison
│   ├── LearningPath.tsx           # Curated learning progression
│   ├── QuantumSovereigntyArab.tsx # Editorial feature page
│   └── QuantumSovereigntyArab.test.tsx # Unit tests
├── data/
│   └── use-cases.json             # 10 use case records
├── hooks/
│   └── useUseCases.ts             # Data loading, validation, lookup hooks
├── types/
│   └── index.ts                   # Zod schemas and TypeScript types
├── utils/
│   ├── filters.ts                 # Filter logic, format helpers, badge mapping
│   └── filters.test.ts           # Unit tests for filter functions
├── i18n/
│   ├── i18n.ts                    # i18next initialization and config
│   ├── i18n.test.ts               # Unit tests
│   ├── rtl.test.tsx               # RTL layout tests
│   └── locales/
│       ├── en.json                # English translations
│       └── ar.json                # Arabic translations
└── tests/
    └── setup.ts                   # Test setup (happy-dom, testing-library matchers)
```

---

## 10. Out of Scope

The following items are explicitly excluded from the current prototype:

| Item | Reason |
|------|--------|
| User authentication / accounts | No personalization needed for content validation prototype |
| Backend API / database | Static JSON sufficient for 10 use cases; no write operations needed |
| Code samples or implementation guides | Focus is on business evaluation, not technical implementation |
| Interactive quantum simulators | Significant engineering effort; deferred to Phase 2 |
| Community features (comments, ratings, submissions) | Requires backend, authentication, moderation; deferred to Phase 2 |
| Email subscriptions or notifications | Requires backend services; deferred to Phase 2 |
| Server-side rendering (SSR) | Vite SPA is sufficient for prototype; SSR needed for SEO at scale |
| Analytics tracking | No analytics library for prototype; Vercel Analytics planned for production |
| Payment or subscription features | Product is free for prototype validation |
| Native mobile apps | Web responsive design is sufficient; mobile apps only if high demand validated |
| Sorting options (alphabetical, by maturity, by impact) | Filtering covers primary discovery needs; sorting deferred |
| Dark mode | Visual feature not critical for content validation |

---

## 11. Risks

### 11.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Static JSON does not scale beyond 50 use cases | Medium | Medium | Plan API backend for Phase 2; current 10 use cases well within static limit |
| Client-side rendering limits SEO discoverability | Medium | High | Implement SSR or pre-rendering for production; acceptable for prototype validation |
| Vite SPA has no server-side error handling for invalid routes | Low | Low | Client-side 404 handling implemented; Vercel SPA rewrite rule needed for deployment |
| Zod validation failure at startup breaks entire app | Low | High | All 10 use cases validated and tested; add error boundary for graceful degradation |
| Bundle size grows with i18n locale files | Low | Low | Currently 2 locales; code-split locales if expanding to 5+ languages |

### 11.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Content becomes outdated as quantum field evolves | High | High | Add `lastUpdated` field to each use case; establish quarterly content review process |
| Target persona (business analyst) may not be the right primary user | Medium | High | Validate with user interviews; track which personas engage most |
| Low engagement due to niche topic | Medium | Medium | Measure against 3-minute session target; pivot to broader tech landscape if needed |
| Competitor launches similar product with more content | Low | Medium | Differentiate through business-first language, comparison feature, and Arab world focus |

### 11.3 User Adoption Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Users find 10 use cases insufficient for their needs | High | Medium | Plan rapid content expansion to 50+ in Phase 2; prioritize breadth |
| Non-technical users struggle with quantum terminology | Medium | Medium | Quantum advantage section uses plain language; add glossary in Phase 2 |
| Comparison feature underutilized due to small catalog | Medium | Low | Comparison becomes more valuable as catalog grows; validate with user feedback |
| Arabic content quality may not match English | Low | Medium | Professional translation review; RTL layout tested |

---

## 12. Appendices

### A. Deployment Configuration

| Setting | Value |
|---------|-------|
| Hosting | Vercel (planned) |
| Dev Server Port | 3100 |
| Build Command | `tsc && vite build` |
| Framework | Vite |
| SPA Fallback | Required (all routes to `index.html`) |

### B. Development Commands

```bash
# Start dev server on port 3100
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Preview production build
npm run preview
```

### C. Related Documents

| Document | Path | Purpose |
|----------|------|---------|
| Product Concept | `docs/CONCEPT.md` | Original concept note and validation hypotheses |
| Architecture Decision Record | `docs/ADRs/ADR-001-prototype-tech.md` | Rationale for Vite over Next.js |
| Agent Addendum | `.claude/addendum.md` | Full technical specification and design patterns |
| Fact-Check Summary | `docs/FACTCHECK-SUMMARY.md` | Use case data accuracy verification |
| Fact-Check Sovereignty | `docs/FACTCHECK-sovereignty.md` | Arab sovereignty content verification |
| User Manual | `docs/quantum-computing-usecases-user-manual.md` | End-user documentation |
| Technical Manual | `docs/quantum-computing-usecases-technical-manual.md` | Developer documentation |

### D. Glossary

| Term | Definition |
|------|-----------|
| Qubit | Quantum bit; the basic unit of quantum information, analogous to a classical bit |
| Gate Depth | The number of sequential quantum gate operations in a circuit; deeper circuits require longer coherence times |
| Error Rate | The probability of a quantum gate operation producing an incorrect result; lower is better |
| Coherence Time | The duration a qubit can maintain its quantum state before decoherence; measured in microseconds |
| QAOA | Quantum Approximate Optimization Algorithm; a hybrid quantum-classical algorithm for combinatorial optimization |
| QAE | Quantum Amplitude Estimation; provides quadratic speedup over classical Monte Carlo methods |
| Maturity Level | Assessment of how close a use case is to production deployment (Theoretical -> Experimental -> Pre-Production -> Production Ready) |
| Post-Quantum Cryptography | Encryption algorithms designed to be secure against both classical and quantum computer attacks |
| RTL | Right-to-Left; text direction used for Arabic and other Semitic languages |
| i18n | Internationalization; the process of designing software to support multiple languages |

---

*Created by*: Product Manager Agent
*Last Updated*: 2026-02-16
*Status*: Complete -- ready for review
