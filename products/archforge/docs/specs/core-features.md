# Feature Specification: ArchForge — Core Features

**Product**: archforge
**Feature Branch**: `feature/archforge/core-mvp`
**Created**: 2026-02-21
**Status**: Accepted
**Version**: 1.0

## Business Context

### Problem Statement

Enterprise architects spend 60-80% of their time on manual documentation — creating ArchiMate diagrams, C4 models, and TOGAF artifacts in specialized tools that require extensive training. Architecture models become stale within 2-4 weeks because updating them is too labour-intensive. No AI-native enterprise architecture tool exists to automate this work.

### Target Users

| Persona | Role | Pain Point | Expected Outcome |
|---------|------|-----------|-----------------|
| Elena (Enterprise Architect) | VP of Enterprise Architecture, 15 yrs exp | Team spends 60% of time on diagrams; models stale in 2-4 weeks | Reduce time-to-architecture from weeks to hours |
| Marcus (Solution Architect) | Senior Solution Architect, 10 yrs exp | 2-3 days per diagram; no reusable templates | Produce high-quality docs in hours instead of days |
| Sarah (CTO) | CTO/IT Director, 20 yrs exp | Can't justify $100K+ EA tools at mid-market scale | Stand up lightweight EA program without dedicated EA team |
| David (Business Analyst) | Senior BA, 7 yrs exp | ArchiMate/TOGAF notation feels foreign | Contribute capability maps without learning complex notation |

### Business Value

- **Revenue Impact**: SaaS subscription — Starter ($49/mo), Professional ($149/mo), Enterprise ($499/mo)
- **User Retention**: Architecture artifacts compound value over time; switching cost increases with each model
- **Competitive Position**: Only AI-native EA tool. 18-month first-mover window before incumbents adapt
- **Strategic Alignment**: $1.14B EA market growing at 6% CAGR; initial SOM $2-5M Year 1

## User Scenarios & Testing

### User Story 1 — Project Creation & Management (Priority: P1)

**As a** solution architect, **I want to** create architecture projects and organize my artifacts into logical workspaces, **so that** I can manage multiple client engagements without mixing architecture models.

**Acceptance Criteria**:

1. **Given** an authenticated architect visits /dashboard, **When** they click "New Project" and enter a name and description, **Then** a project is created and they are redirected to the project workspace
2. **Given** a project owner, **When** they invite team members with roles (editor, viewer), **Then** the invited users can access the project with appropriate permissions
3. **Given** a project with multiple artifacts, **When** the owner views the project, **Then** all artifacts are listed with type, last modified date, and version number

### User Story 2 — AI Architecture Generation (Priority: P1)

**As an** enterprise architect, **I want to** describe my system in natural language and have AI generate standards-compliant architecture diagrams, **so that** I can produce ArchiMate, C4, and TOGAF artifacts in minutes instead of days.

**Acceptance Criteria**:

1. **Given** an architect opens the generation panel, **When** they describe a system (e.g., "microservices e-commerce platform with payment gateway"), **Then** the AI generates a valid ArchiMate or C4 diagram within 30 seconds
2. **Given** a generated artifact, **When** the architect reviews it, **Then** all elements comply with the selected framework's notation rules (ArchiMate 3.2, C4, or TOGAF)
3. **Given** a generated diagram, **When** the architect wants to refine it, **Then** they can provide follow-up instructions and the AI modifies the existing diagram incrementally

### User Story 3 — Interactive Canvas Editing (Priority: P1)

**As a** solution architect, **I want to** interactively edit generated diagrams on a visual canvas, **so that** I can fine-tune layouts, add elements, and adjust relationships without regenerating the entire artifact.

**Acceptance Criteria**:

1. **Given** a generated artifact, **When** the architect opens the canvas editor, **Then** all elements are interactive (draggable, resizable, connectable)
2. **Given** an element on the canvas, **When** the architect right-clicks it, **Then** a context menu shows options: edit properties, delete, connect to another element, duplicate
3. **Given** a modified canvas, **When** the architect saves, **Then** a new version is created preserving the complete edit history

### User Story 4 — Multi-Format Export (Priority: P1)

**As an** enterprise architect, **I want to** export my architecture artifacts in multiple formats (PNG, SVG, PDF, PlantUML, ArchiMate XML), **so that** I can share deliverables with stakeholders using their preferred tools.

**Acceptance Criteria**:

1. **Given** a completed artifact, **When** the architect clicks Export and selects PNG/SVG, **Then** a high-resolution image is generated and downloaded within 5 seconds
2. **Given** a completed artifact, **When** the architect exports as ArchiMate XML, **Then** the output is valid ArchiMate 3.2 Open Exchange format importable into Archi or other EA tools
3. **Given** a completed artifact, **When** the architect exports as PlantUML, **Then** the output renders correctly in any PlantUML viewer

### User Story 5 — Template Library (Priority: P2)

**As a** business analyst with limited EA experience, **I want to** start from pre-built architecture templates, **so that** I can create professional-quality deliverables without learning complex notation.

**Acceptance Criteria**:

1. **Given** a user browses the template gallery, **When** they filter by framework (TOGAF, C4, ArchiMate), **Then** relevant templates are displayed with preview thumbnails and descriptions
2. **Given** a selected template, **When** the user applies it to a project, **Then** a new artifact is created with the template structure and placeholder elements ready for customisation
3. **Given** a user creates a reusable architecture pattern, **When** they save it as a custom template, **Then** it appears in their personal template library for future use

### User Story 6 — Document Ingestion (Priority: P2)

**As an** enterprise architect, **I want to** upload existing architecture documents (PDF, DOCX) and have AI extract architecture elements, **so that** I can digitise legacy documentation into interactive models.

**Acceptance Criteria**:

1. **Given** an architect uploads a PDF/DOCX document, **When** the system processes it, **Then** text is extracted and parsed for architecture elements (systems, components, relationships)
2. **Given** extracted architecture elements, **When** the architect reviews them, **Then** they can accept, reject, or modify each element before generating the diagram
3. **Given** a document with embedded diagrams, **When** the system processes it, **Then** a summary of identified architecture patterns is presented alongside the extracted elements
