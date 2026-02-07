# Mu'aththir -- Product Requirements Document

**Version**: 1.0
**Status**: Draft
**Last Updated**: 2026-02-07
**Product Manager**: Claude Product Manager

---

## 1. Executive Summary

### 1.1 Vision

Mu'aththir is a holistic child development platform that helps parents track and nurture their children across six interconnected dimensions: Academic, Social-Emotional, Behavioural, Aspirational, Islamic, and Physical. Rather than reducing a child to a grade or a report card, Mu'aththir treats every child as a complete human being -- intellectually, emotionally, spiritually, and physically.

The name "Mu'aththir" means "influential" or "impactful" in Arabic. The platform embodies the belief that intentional, holistic parenting creates children who grow into adults of genuine impact.

### 1.2 Problem Statement

Parents lack a unified system to track their children's development across the dimensions that matter. Current tools are fragmented and one-dimensional:

**Core Problems We Solve**:
- **Fragmented tracking**: Parents use separate apps for grades, health, Quran progress, and behaviour charts. No tool connects these dimensions into a coherent picture of the child.
- **Missing dimensions**: Mainstream tools ignore spiritual development, aspirational growth, and social-emotional intelligence entirely. Parents who care about Islamic tarbiyah (upbringing) have zero digital support.
- **Age-inappropriate expectations**: Parents lack guidance on what developmental milestones are appropriate for a 5-year-old versus a 12-year-old across all dimensions, leading to either under-stimulation or burnout.
- **No longitudinal view**: Parents can describe yesterday but not the trajectory. Without historical tracking, they cannot see patterns, regressions, or breakthroughs across months and years.
- **Reactive parenting**: Without structured observation, parents respond to crises (bad grade, behavioural incident) rather than proactively nurturing strengths and addressing gaps before they become problems.

**The Opportunity**: The Muslim parenting market is underserved by technology. There are 1.8 billion Muslims globally, with a young demographic skew. Muslim parents invest heavily in their children's development -- both worldly and spiritual. No platform exists that honours all six dimensions of a child's growth in a single, integrated experience. Furthermore, five of the six dimensions (all except Islamic) are universal, making the platform relevant to any parent who wants a holistic approach.

### 1.3 Target Market

**Primary**: Muslim parents with children ages 3-16
- Families who prioritize both academic achievement and Islamic values
- Parents seeking structured approaches to child development
- Homeschooling families and weekend Islamic school families
- Families in Western countries navigating dual-culture upbringing

**Secondary**: Any parent seeking holistic child development tracking
- Parents dissatisfied with grade-only school tracking
- Parents interested in social-emotional learning (SEL)
- Parents of children with developmental goals across multiple areas

**Initial Launch Market**: English-speaking Muslim families globally (US, UK, Canada, Australia, Gulf states)

### 1.4 Success Metrics

**Business KPIs**:
- **Registered Families**: 1,000 in first 6 months
- **Active Monthly Users**: 40% of registered families log at least 2 observations per week
- **Paid Conversions**: 8% free-to-paid conversion rate within 90 days
- **MRR**: $3,000 MRR by month 6 (375+ paid users at $8/month)
- **Churn**: <6% monthly churn on paid plans

**Product KPIs**:
- **Time to First Observation**: <5 minutes from completing onboarding
- **Observations Per Child Per Week**: 3+ average across active users
- **Dimension Coverage**: 80%+ of active users log observations in at least 4 of 6 dimensions per month
- **Milestone Engagement**: 60%+ of parents review milestone checklists within the first week
- **Dashboard Return Rate**: 70%+ of active users view the radar chart at least once per week

**User Experience KPIs**:
- **NPS**: >55
- **User Satisfaction**: >4.5/5 on holistic tracking value
- **Support Ticket Volume**: <2% of active users per month

---

## 2. User Personas

### Persona 1: Fatima -- Engaged Muslim Mother

**Demographics**:
- Age: 34
- Role: Stay-at-home mother, part-time freelance writer
- Children: 3 (ages 5, 8, and 12)
- Location: London, UK
- Technical Skill: Medium (uses WhatsApp, Instagram, Google Docs)
- Current Tracking: Paper notebook, scattered WhatsApp voice notes to herself

**Goals**:
- Track each child's Quran memorization progress alongside their school performance
- Identify when her 8-year-old's social difficulties at school are getting better or worse
- Set age-appropriate goals for each child that balance dunya (worldly) and akhirah (hereafter)
- Have a record of her children's growth to look back on as they get older

**Pain Points**:
- Her 12-year-old is struggling academically but thriving in Islamic studies; she has no way to see this balance and communicate it to her husband or the child
- She suspects her 5-year-old has exceptional social-emotional intelligence but has no structured way to document it
- She forgets observations within days; her paper notebook is disorganized and unsearchable
- She feels guilty about not tracking physical development (nutrition, sleep, activity) for any of her children

**Usage Context**:
- Logs observations in the evening after children go to bed, or during quiet moments
- Wants to quickly record something she noticed ("Ahmed shared his lunch with the new boy today -- empathy growing")
- Reviews the dashboard on weekends to plan the coming week's focus areas
- Shares progress with her husband monthly

**What Fatima Says**:
_"I can see my children growing every day, but I have no way to capture it. By the time I want to talk to their teacher or plan for next month, I have forgotten the specific moments that mattered."_

---

### Persona 2: Yusuf -- Professional Muslim Father

**Demographics**:
- Age: 41
- Role: Software engineer at a tech company
- Children: 2 (ages 7 and 10)
- Location: Toronto, Canada
- Technical Skill: High
- Current Tracking: Spreadsheet with grades and Quran progress only

**Goals**:
- Track his children's development with data, not gut feeling
- Ensure his children develop strong Islamic identity while succeeding in Canadian society
- Monitor screen time, physical activity, and sleep patterns alongside academic progress
- Set aspirational goals (career exploration, leadership skills) early and track progress

**Pain Points**:
- His spreadsheet only captures grades and surah memorization; everything else is in his head
- His wife and he disagree on whether their 10-year-old's behaviour is improving; they have no objective record
- He wants to encourage his 7-year-old's interest in science but does not know if it is a passing phase or genuine aptitude
- He knows his children need more physical activity but has no system to track or motivate it

**Usage Context**:
- Reviews data weekly, prefers charts and visual summaries
- Logs observations quickly on his phone during the week
- Wants to see trends over months, not just daily snapshots
- Values the radar chart to see which dimensions need attention

**What Yusuf Says**:
_"I track my fitness, my finances, and my work projects with data. Why do I not have the same for the most important project of my life -- raising my children?"_

---

### Persona 3: Aisha -- Homeschooling Mother

**Demographics**:
- Age: 29
- Role: Full-time homeschooling parent
- Children: 1 (age 6)
- Location: Houston, Texas, USA
- Technical Skill: Medium-High
- Current Tracking: Multiple apps (ClassDojo for behaviour, Khan Academy for academics, scattered notes for Islamic studies)

**Goals**:
- Replace her 4 separate tracking tools with one unified platform
- Document homeschool progress for annual state reporting requirements
- Track her daughter's development across all areas to ensure homeschooling covers the whole child
- Have milestone checklists to know if her daughter is on track developmentally

**Pain Points**:
- Using 4 different apps means nothing connects; she cannot see the full picture
- She worries she is over-emphasizing academics and under-emphasizing social-emotional development because she has no benchmark
- State reporting requires showing "adequate progress" but she has no structured records
- She wants milestone guidance for physical development (gross motor, fine motor) but medical apps are clinical, not parental

**Usage Context**:
- Logs observations throughout the school day as part of her homeschool routine
- Uses milestone checklists weekly to plan curriculum
- Exports or prints progress reports monthly
- Would use the platform daily as a teaching companion

**What Aisha Says**:
_"I chose to homeschool so I could give my daughter a complete education -- academic, spiritual, emotional, physical. But I have no single tool that understands what 'complete' means."_

---

## 3. The Six Dimensions Model

The six dimensions are the intellectual foundation of Mu'aththir. Each dimension represents a facet of child development that parents can observe, track, and nurture. The dimensions are interconnected, not siloed.

### 3.1 Academic

**What it covers**: School and learning progress, grades, subject mastery, curriculum milestones, learning style observations, homework habits, reading level, mathematical reasoning.

**Example observations**:
- "Completed multiplication tables up to 12. Confident and fast."
- "Struggles with reading comprehension but loves being read to."
- "Showed interest in astronomy after watching a documentary."

**Age-appropriate milestones** (examples):
- Age 3-5: Recognises letters, counts to 20, writes own name
- Age 6-9: Reads independently, basic multiplication, writes paragraphs
- Age 10-12: Research projects, pre-algebra, critical reading
- Age 13-16: Subject specialisation, exam preparation, independent study habits

### 3.2 Social-Emotional

**What it covers**: Emotional intelligence, empathy, friendship skills, conflict resolution, self-awareness, emotional regulation, relationship building, communication skills.

**Example observations**:
- "Comforted a crying friend at the park without being prompted."
- "Had a meltdown when plans changed; still working on flexibility."
- "Used words to express anger instead of hitting -- first time!"

**Connection to Islamic values**: Husn al-khuluq (good character), rahma (mercy), ihsan in relationships.

### 3.3 Behavioural

**What it covers**: Conduct, habits, discipline, self-regulation, screen time management, chore completion, routine adherence, impulse control, responsibility.

**Example observations**:
- "Completed morning routine without reminders for the third day in a row."
- "Screen time exceeded limit; became argumentative when asked to stop."
- "Took responsibility for breaking a glass without being caught."

**Connection to Islamic values**: Sabr (patience), taqwa (self-discipline), amana (trustworthiness).

### 3.4 Aspirational

**What it covers**: Goals, dreams, motivation, career exploration, role models, leadership development, growth mindset, ambition, project completion.

**Example observations**:
- "Said she wants to be a doctor. Asked her what kind -- she said 'the kind that helps people who cannot afford it.'"
- "Finished building his first Lego set without help. Proud of the perseverance."
- "Talked about wanting to memorise the entire Quran by age 15."

**Connection to Islamic values**: Tawakkul (trust in Allah while taking action), himma (high aspiration), ikhlas (sincerity of intention).

### 3.5 Islamic

**What it covers**: Quran memorization and recitation progress, prayer habits and quality, Islamic knowledge (seerah, fiqh, aqeedah), values and akhlaq, dua memorization, Ramadan engagement, charity/sadaqah habits.

**Example observations**:
- "Memorised Surah Al-Mulk. Recitation is clear but tajweed needs work on idgham."
- "Prayed Fajr on time every day this week without being woken up."
- "Asked a thoughtful question about why Allah tests people."
- "Chose to give part of his Eid money to charity without being asked."

**Sub-categories**:
- **Quran**: Surah/ayah memorised, tajweed quality, recitation regularity
- **Salah**: Consistency, punctuality, khushu (focus), understanding of meaning
- **Knowledge**: Seerah, fiqh basics, aqeedah understanding, Arabic learning
- **Character (Akhlaq)**: Truthfulness, generosity, respect for elders, kindness
- **Ibadah (Worship)**: Dua, dhikr, fasting (age-appropriate), sadaqah

### 3.6 Physical

**What it covers**: Health metrics, fitness activities, motor skill development, sports participation, nutrition habits, sleep patterns, growth tracking.

**Example observations**:
- "Learned to ride a bicycle without training wheels."
- "Sleep has been irregular -- averaging 8 hours but bedtime varies by 2 hours."
- "Joined the school football team. Attends practice twice a week."
- "Eating more vegetables this month after we started a family garden."

**Connection to Islamic values**: The body as an amanah (trust) from Allah, cleanliness (taharah), moderation in eating.

---

## 4. Features

### 4.1 MVP Features (Must Have)

| ID | Feature | User Story | Priority |
|----|---------|------------|----------|
| F-001 | Parent Authentication | As a parent, I want to create an account and log in so my family's data is private and secure | P0 |
| F-002 | Child Profile Creation | As a parent, I want to create a profile for my child with their name, date of birth, and photo so I can track their development | P0 |
| F-003 | Six-Dimension Dashboard | As a parent, I want to see a radar chart showing my child's development across all 6 dimensions so I can understand their holistic profile at a glance | P0 |
| F-004 | Observation Logging | As a parent, I want to record observations about my child tagged to a specific dimension so I build a rich developmental record over time | P0 |
| F-005 | Milestone Checklists | As a parent, I want to see age-appropriate developmental milestones for each dimension so I know what to look for and where my child stands | P0 |
| F-006 | Progress Timeline | As a parent, I want to see a chronological timeline of all observations for my child so I can review their journey and spot patterns | P0 |
| F-007 | Dimension Detail View | As a parent, I want to drill into a single dimension to see all observations, milestones, and trends specific to that area | P0 |
| F-008 | Basic Settings | As a parent, I want to manage my account settings including profile, password, and notification preferences | P0 |

### 4.2 Phase 2 Features (Should Have)

| ID | Feature | User Story | Priority |
|----|---------|------------|----------|
| F-009 | AI Insights | As a parent, I want AI-generated insights about my child's development patterns so I get actionable guidance without being an expert | P1 |
| F-010 | Multi-Child Family View | As a parent with multiple children, I want a family dashboard comparing all children's profiles so I can allocate attention where it is needed | P1 |
| F-011 | Goal Setting | As a parent, I want to set specific goals per dimension (e.g., "memorise Surah Yasin by Ramadan") and track progress toward them | P1 |
| F-012 | Progress Reports | As a parent, I want to generate printable/PDF progress reports summarising my child's development over a period | P1 |
| F-013 | Observation Photos/Media | As a parent, I want to attach photos or voice notes to observations so I can capture moments more richly | P1 |
| F-014 | Reminders and Prompts | As a parent, I want configurable reminders to log observations so I maintain consistency | P1 |

### 4.3 Future Considerations (Nice to Have)

- Teacher/tutor collaboration (shared view with permissions)
- Community features (anonymous benchmarking, tips from other parents)
- Gamification for children (age-appropriate achievement badges)
- Mobile app (iOS/Android)
- Arabic language support (full RTL)
- Quran memorization tracker with audio recitation
- Integration with school learning management systems
- AI-powered activity suggestions per dimension
- Export data for medical professionals or educators
- Family sharing (grandparents, co-parents)
- Developmental concern flagging (e.g., "speech milestones behind for age")
- Ramadan special tracking mode (fasting, extra ibadah, Quran khatm)

---

## 5. Site Map

| Route | Phase | Description |
|-------|-------|-------------|
| `/` | MVP | Landing page -- product value proposition, dimension overview, CTA to sign up |
| `/signup` | MVP | Parent registration (email/password) |
| `/login` | MVP | Parent login |
| `/forgot-password` | MVP | Password reset request |
| `/reset-password` | MVP | Password reset with token |
| `/onboarding` | MVP | Post-signup flow: create first child profile, select relevant dimensions |
| `/onboarding/child` | MVP | Child profile creation during onboarding |
| `/dashboard` | MVP | Main dashboard -- child selector (if multiple children) + 6-dimension radar chart + recent observations + quick-log button |
| `/dashboard/observe` | MVP | New observation form -- select dimension, write observation, optional tags |
| `/dashboard/timeline` | MVP | Chronological timeline of all observations for the selected child, filterable by dimension |
| `/dashboard/dimensions` | MVP | Grid view of all 6 dimensions with summary cards |
| `/dashboard/dimensions/academic` | MVP | Academic dimension detail -- observations, milestones, trends |
| `/dashboard/dimensions/social-emotional` | MVP | Social-Emotional dimension detail |
| `/dashboard/dimensions/behavioural` | MVP | Behavioural dimension detail |
| `/dashboard/dimensions/aspirational` | MVP | Aspirational dimension detail |
| `/dashboard/dimensions/islamic` | MVP | Islamic dimension detail -- includes Quran tracker sub-section |
| `/dashboard/dimensions/physical` | MVP | Physical dimension detail |
| `/dashboard/milestones` | MVP | All milestone checklists organised by dimension and age band |
| `/dashboard/milestones/:dimension` | MVP | Milestone checklist for a specific dimension |
| `/dashboard/child/:id` | MVP | Child profile view and edit |
| `/dashboard/child/:id/edit` | MVP | Edit child profile |
| `/dashboard/settings` | MVP | Account settings (profile, email, password) |
| `/dashboard/settings/notifications` | MVP | Notification preferences |
| `/dashboard/settings/subscription` | MVP | Subscription plan management |
| `/pricing` | MVP | Pricing page (Free, Premium tiers) |
| `/about` | MVP | About the Mu'aththir methodology and team |
| `/privacy` | MVP | Privacy policy |
| `/terms` | MVP | Terms of service |
| `/dashboard/family` | Phase 2 | Multi-child family overview with comparative radar charts |
| `/dashboard/goals` | Phase 2 | Goal setting and tracking |
| `/dashboard/goals/new` | Phase 2 | Create new goal |
| `/dashboard/goals/:id` | Phase 2 | Goal detail and progress |
| `/dashboard/reports` | Phase 2 | Progress report generation |
| `/dashboard/reports/generate` | Phase 2 | Report configuration and download |
| `/dashboard/insights` | Phase 2 | AI-powered developmental insights |
| `/dashboard/settings/sharing` | Phase 2 | Family sharing and permissions |

---

## 6. User Flows

### 6.1 Onboarding Flow

```
New parent visits /
  -> Sees landing page with 6-dimension model explanation
  -> Clicks "Start Tracking" or "Sign Up Free"
  -> /signup loads
  -> Enters: name, email, password
  -> Account created, redirected to /onboarding
  -> Step 1: "Tell us about your child"
     -> Enters: child's name, date of birth, gender (optional), photo (optional)
  -> Step 2: "Which dimensions matter most to you?"
     -> All 6 shown with descriptions
     -> All pre-selected (parent can deselect any they want to skip for now)
  -> Step 3: "Your child's dashboard is ready"
     -> Shows the radar chart (empty/baseline) with a prompt to log the first observation
  -> Redirected to /dashboard with a guided tooltip:
     "Start by recording something you noticed about [child name] today"
  -> User clicks "Log Observation" button
  -> /dashboard/observe loads with dimension selector and text input
  -> User writes first observation, selects dimension, saves
  -> Returns to dashboard -- radar chart now has one data point
```

**Time to Complete**: <5 minutes from signup to first observation

---

### 6.2 Log Observation Flow (Core Loop)

```
Parent is on /dashboard
  -> Clicks "Log Observation" floating action button
  -> /dashboard/observe loads with:
     - Child selector (if multiple children, defaults to last viewed)
     - Dimension selector (6 options with icons and colours)
     - Observation text area (free-form, up to 1,000 characters)
     - Sentiment indicator (positive / neutral / needs attention)
     - Date (defaults to today, can backdate)
     - Optional tags (e.g., "quran", "school", "sports", "social")
  -> Parent selects dimension: "Islamic"
  -> Types: "Prayed Isha in congregation at the masjid for the first time.
     Was nervous but did it. Very proud moment."
  -> Selects sentiment: Positive
  -> Clicks "Save Observation"
  -> Observation saved with timestamp
  -> Redirected to dashboard; radar chart updates
  -> Success message: "Observation recorded in Islamic dimension"
```

**Time to Complete**: <1 minute per observation

---

### 6.3 Review Dashboard Flow

```
Parent navigates to /dashboard
  -> Sees:
     - Child name and photo at top (with selector if multiple children)
     - 6-dimension radar chart (central, prominent)
     - "Recent Observations" feed (last 5, with dimension colour-coding)
     - "Milestones Due" section (upcoming milestones for child's age)
     - "Log Observation" floating action button
  -> Clicks on a radar chart segment (e.g., "Behavioural")
  -> /dashboard/dimensions/behavioural loads with:
     - Dimension score/trend summary
     - All observations for this dimension (chronological)
     - Milestone checklist for this dimension at child's age
     - Trend graph showing observation frequency and sentiment over time
  -> Parent can click "View All Milestones" to go to milestone checklist
  -> Parent can click any observation to expand and edit it
```

---

### 6.4 Milestone Review Flow

```
Parent navigates to /dashboard/milestones
  -> Sees dimensions listed with progress bars:
     "Academic: 7/12 milestones achieved"
     "Social-Emotional: 4/10 milestones achieved"
     etc.
  -> Clicks on "Islamic"
  -> /dashboard/milestones/islamic loads with:
     - Age band automatically selected based on child's DOB
     - Checklist of milestones with checkboxes:
       [ ] Knows the 5 pillars of Islam
       [x] Can recite Surah Al-Fatiha from memory
       [ ] Prays 5 times daily with reminders
       [x] Knows the names of the 5 daily prayers
       [ ] Can make wudu independently
       etc.
  -> Parent checks off a milestone: "Can make wudu independently"
  -> Date auto-recorded, milestone marked as achieved
  -> Dashboard radar chart updates to reflect progress
```

---

### 6.5 Timeline Review Flow

```
Parent navigates to /dashboard/timeline
  -> Sees a vertical timeline of all observations, newest first
  -> Each entry shows:
     - Date
     - Dimension (colour-coded badge)
     - Observation text (truncated with "read more")
     - Sentiment icon
  -> Filter controls at top:
     - Dimension filter (multi-select)
     - Date range picker
     - Sentiment filter (positive / neutral / needs attention)
     - Search box (full-text search of observation text)
  -> Parent filters to "Social-Emotional" + "Needs Attention" over last 3 months
  -> Sees pattern of observations about difficulty sharing with siblings
  -> Recognises this is an area to focus on
```

---

## 7. Requirements

### 7.1 Functional Requirements

**Authentication and Accounts**:
- FR-001: Parents can sign up with email and password
- FR-002: Passwords require minimum 8 characters, 1 uppercase letter, 1 number
- FR-003: Parents can reset their password via email link (valid 1 hour)
- FR-004: Sessions expire after 7 days of inactivity
- FR-005: Parents can update their profile (name, email, password)
- FR-006: Parents can delete their account and all associated data

**Child Profiles**:
- FR-007: Parents can create a child profile with: name (required), date of birth (required), gender (optional), photo (optional)
- FR-008: The system calculates the child's age band from their date of birth: 3-5 (Early Years), 6-9 (Primary), 10-12 (Upper Primary), 13-16 (Secondary)
- FR-009: Parents can edit child profile information at any time
- FR-010: Parents can have up to 6 child profiles on the free tier, unlimited on paid
- FR-011: Deleting a child profile requires confirmation and deletes all associated observations and milestone data

**Observation Logging**:
- FR-012: Parents can create an observation with: dimension (required, one of 6), text (required, 1-1,000 characters), sentiment (required: positive, neutral, needs_attention), date (defaults to today, can be backdated up to 1 year), tags (optional, free-form, up to 5 per observation)
- FR-013: Each observation is associated with exactly one child and one dimension
- FR-014: Parents can edit an observation's text, sentiment, and tags after creation
- FR-015: Parents can delete an observation (soft delete; recoverable within 30 days)
- FR-016: The system records creation timestamp and last-modified timestamp for every observation
- FR-017: Observations are displayed in reverse chronological order by default

**Six-Dimension Dashboard**:
- FR-018: The dashboard displays a radar/spider chart with 6 axes, one per dimension
- FR-019: Each axis value is calculated from: (number of observations in last 30 days x 0.4) + (milestone completion percentage x 0.4) + (positive sentiment ratio x 0.2), normalised to a 0-100 scale
- FR-020: The radar chart updates in real-time when observations are logged or milestones are checked
- FR-021: Below the radar chart, the dashboard shows the 5 most recent observations across all dimensions
- FR-022: The dashboard shows a "Milestones Due" section listing the next 3 unchecked milestones for the child's current age band
- FR-023: If the parent has multiple children, a child selector appears at the top of the dashboard

**Milestone Checklists**:
- FR-024: The system provides pre-defined milestone checklists for each of the 6 dimensions, segmented by 4 age bands (3-5, 6-9, 10-12, 13-16)
- FR-025: Each milestone has: title, description, dimension, age band, and optional guidance text for parents
- FR-026: Parents can mark a milestone as achieved; the date of achievement is recorded automatically
- FR-027: Parents can unmark a previously achieved milestone (with the original achievement date preserved in history)
- FR-028: Milestone completion percentage is calculated per dimension per age band
- FR-029: When a child's age crosses into a new age band, the system shows the new milestones while preserving the previous band's completion history
- FR-030: The system ships with a minimum of 10 milestones per dimension per age band (240 milestones total minimum)

**Dimension Detail View**:
- FR-031: Each dimension has a dedicated detail page accessible from the dashboard
- FR-032: The detail page shows: all observations for this dimension (paginated, 20 per page), milestone checklist for the child's current age band, a trend graph showing observation count and sentiment distribution over the last 6 months
- FR-033: The trend graph shows monthly data points with: total observations (bar), positive percentage (line), and a "needs attention" count (highlight)

**Progress Timeline**:
- FR-034: The timeline page displays all observations for a child across all dimensions in reverse chronological order
- FR-035: Each timeline entry shows: date, dimension (colour-coded badge), sentiment icon, observation text (first 150 characters with expand), and tags
- FR-036: The timeline supports filtering by: dimension (multi-select), sentiment, date range, and free-text search
- FR-037: The timeline supports infinite scroll pagination (20 entries per load)

**Settings and Account**:
- FR-038: Parents can update their name and email
- FR-039: Parents can change their password (requires current password)
- FR-040: Parents can manage notification preferences (email digest frequency: daily, weekly, off)
- FR-041: Parents can view and manage their subscription (free or premium)
- FR-042: Parents can export all their data as JSON (GDPR compliance)

### 7.2 Non-Functional Requirements

**Performance**:
- NFR-001: Dashboard (including radar chart) loads in <2 seconds (LCP) for a child with up to 500 observations
- NFR-002: Observation save completes in <500ms (p95)
- NFR-003: Timeline loads first page in <1 second for up to 2,000 observations
- NFR-004: API response time <200ms (p95) for non-aggregation endpoints
- NFR-005: Radar chart calculation completes in <300ms server-side

**Security**:
- NFR-006: All communication over HTTPS with TLS 1.3
- NFR-007: Passwords hashed with bcrypt (cost factor 12)
- NFR-008: JWT tokens with 1-hour expiry, refresh tokens with 7-day expiry
- NFR-009: Rate limiting: 200 requests/minute per user for general endpoints, 30/minute for auth endpoints
- NFR-010: All database queries filtered by parent_id (resource ownership enforcement)
- NFR-011: Input sanitization on all user-provided text (XSS prevention)
- NFR-012: CSRF protection on all state-changing endpoints
- NFR-013: Child data (names, observations) encrypted at rest

**Reliability**:
- NFR-014: API uptime SLA of 99.9%
- NFR-015: Database backups daily with 30-day retention
- NFR-016: Soft-deleted observations recoverable for 30 days
- NFR-017: Graceful degradation: if radar chart calculation fails, show observations without the chart

**Scalability**:
- NFR-018: System supports 5,000 concurrent users
- NFR-019: Database design supports 100,000+ children and 10M+ observations
- NFR-020: Radar chart calculation is cacheable and invalidated on observation/milestone changes

**Accessibility**:
- NFR-021: Web application meets WCAG 2.1 Level AA
- NFR-022: Full keyboard navigation support
- NFR-023: Colour contrast ratio >= 4.5:1 for all text
- NFR-024: Screen reader compatible (ARIA labels on all interactive elements)
- NFR-025: Radar chart has a text-based alternative for screen readers (table of dimension scores)

**Internationalisation**:
- NFR-026: All UI text externalised for future translation
- NFR-027: Date formatting respects user locale
- NFR-028: Arabic text in observations renders correctly (bidirectional text support)
- NFR-029: Unicode support for Arabic names, observations, and milestone text

**Data and Privacy**:
- NFR-030: GDPR-compliant data handling (consent, right to deletion, data portability)
- NFR-031: Children's data receives extra protection (COPPA principles applied even if not legally required)
- NFR-032: No child data shared with third parties under any circumstances
- NFR-033: Parent can export all data as JSON within 24 hours of request
- NFR-034: All data deleted within 30 days of account deletion request
- NFR-035: No analytics or tracking pixels on pages displaying child data

---

## 8. Acceptance Criteria

### F-001: Parent Authentication

**Signup with Email**:
Given a new visitor on /signup
When they enter a valid name, email, and password (8+ chars, 1 uppercase, 1 number)
Then an account is created
And they are redirected to /onboarding
And a welcome email is sent

**Login**:
Given a registered parent on /login
When they enter valid credentials
Then they are redirected to /dashboard
And a session is created (JWT + refresh token)

**Invalid Login**:
Given a visitor on /login
When they enter an email that does not exist or a wrong password
Then the error message says "Invalid email or password" (does not reveal which is wrong)
And the attempt is rate-limited after 5 failures in 15 minutes

**Password Reset**:
Given a parent who forgot their password
When they enter their email on /forgot-password
Then a reset link is emailed (valid for 1 hour, single-use)
And clicking the link loads /reset-password where they set a new password

**Logout**:
Given a logged-in parent
When they click "Log Out"
Then their session is invalidated
And they are redirected to /login

---

### F-002: Child Profile Creation

**Create Child Profile**:
Given a logged-in parent on /onboarding/child or /dashboard/child/:id/edit
When they enter a child name and date of birth
Then a child profile is created
And the age band is calculated automatically from the date of birth
And the child appears in the dashboard child selector

**Age Band Calculation**:
Given a child born on 2020-03-15
When the current date is 2026-02-07
Then the child's age is 5 years, 10 months
And the age band is "Early Years (3-5)"

**Age Band Transition**:
Given a child whose age crosses from 5 to 6
When the child's 6th birthday passes
Then the age band changes from "Early Years (3-5)" to "Primary (6-9)"
And new milestones for "Primary (6-9)" become visible
And "Early Years (3-5)" milestones remain visible with their completion status preserved

**Photo Upload**:
Given a parent creating a child profile
When they upload a photo (JPEG or PNG, max 5MB)
Then the photo is resized to 200x200 pixels
And displayed in the dashboard and child profile

**Profile Limit (Free Tier)**:
Given a parent on the free tier with 6 child profiles
When they try to create a 7th child profile
Then they see a message: "Free plan supports up to 6 children. Upgrade to Premium for unlimited profiles."

---

### F-003: Six-Dimension Dashboard

**Radar Chart Display**:
Given a parent with a child who has observations across 4 dimensions
When they view /dashboard
Then a radar chart is displayed with 6 axes labelled: Academic, Social-Emotional, Behavioural, Aspirational, Islamic, Physical
And the 4 dimensions with data show calculated scores
And the 2 dimensions without data show a score of 0

**Radar Chart Score Calculation**:
Given a child in the "Primary (6-9)" age band with:
- 8 observations in "Academic" in the last 30 days (6 positive, 1 neutral, 1 needs_attention)
- 5 of 12 Academic milestones completed for their age band
When the dashboard radar chart renders
Then the Academic axis score = (min(8,10)/10 * 40) + (5/12 * 40) + (6/8 * 20)
= (0.8 * 40) + (0.4167 * 40) + (0.75 * 20)
= 32 + 16.67 + 15 = 63.67, rounded to 64

**Recent Observations**:
Given a child with 20 observations across multiple dimensions
When the parent views /dashboard
Then the 5 most recent observations are shown below the radar chart
And each shows: dimension badge (colour-coded), date, first 100 characters of text, and sentiment icon

**Milestones Due**:
Given a child with unchecked milestones for their age band
When the parent views /dashboard
Then up to 3 unchecked milestones are shown in a "Coming Up" section
And each shows: dimension, milestone title, and a "Mark Complete" button

**Child Selector**:
Given a parent with 3 children
When they view /dashboard
Then a dropdown/toggle shows all children's names
And selecting a different child loads that child's radar chart and observations

---

### F-004: Observation Logging

**Create Observation**:
Given a parent on /dashboard/observe
When they select dimension "Islamic", type "Recited Surah Al-Kahf on Friday without mistakes", select sentiment "Positive", and click Save
Then the observation is saved with the current timestamp
And they are redirected to /dashboard
And the observation appears in the "Recent Observations" section
And the Islamic dimension score on the radar chart updates

**Backdate Observation**:
Given a parent on /dashboard/observe
When they change the date to 3 days ago
Then the observation is saved with the backdated timestamp
And it appears in the correct chronological position on the timeline

**Validation -- Missing Dimension**:
Given a parent on /dashboard/observe
When they type an observation but do not select a dimension
Then the Save button is disabled
And a message shows: "Please select a dimension"

**Validation -- Empty Text**:
Given a parent on /dashboard/observe
When they select a dimension but leave the text empty
Then the Save button is disabled
And a message shows: "Please describe what you observed"

**Validation -- Text Too Long**:
Given a parent typing an observation
When the text exceeds 1,000 characters
Then a character counter shows "1,001/1,000" in red
And the Save button is disabled

**Edit Observation**:
Given a parent viewing an observation on the timeline or dimension detail
When they click "Edit"
Then the observation text, sentiment, and tags become editable
And they can save changes
And the last-modified timestamp updates

**Delete Observation**:
Given a parent viewing an observation
When they click "Delete" and confirm
Then the observation is soft-deleted
And it disappears from the timeline and dashboard
And the radar chart score updates

---

### F-005: Milestone Checklists

**View Milestones by Dimension**:
Given a parent on /dashboard/milestones/academic
When the child is 7 years old (Primary 6-9 age band)
Then the Academic milestones for "Primary (6-9)" are displayed
And each milestone shows: title, description, checkbox, and completion date (if achieved)

**Mark Milestone as Achieved**:
Given a parent viewing a milestone "Can read a chapter book independently"
When they check the checkbox
Then the milestone is marked as achieved with today's date
And the milestone completion percentage updates
And the dashboard radar chart score recalculates

**Unmark Milestone**:
Given a parent who previously marked a milestone as achieved
When they uncheck the checkbox
Then the milestone returns to "not achieved" status
And the original achievement date is preserved in history
And the completion percentage and radar chart update

**Milestone Content**:
Given the system has milestone data loaded
Then there are at least 10 milestones per dimension per age band
And each milestone has a title (max 100 characters) and description (max 300 characters)
And milestones are ordered by typical developmental progression

---

### F-006: Progress Timeline

**View Timeline**:
Given a child with 50 observations across all dimensions
When the parent visits /dashboard/timeline
Then the first 20 observations are shown in reverse chronological order
And scrolling to the bottom loads the next 20

**Filter by Dimension**:
Given a parent on /dashboard/timeline
When they select "Islamic" and "Academic" from the dimension filter
Then only observations tagged to those 2 dimensions are shown

**Filter by Sentiment**:
Given a parent on /dashboard/timeline
When they select "Needs Attention" from the sentiment filter
Then only observations with sentiment "needs_attention" are shown

**Search**:
Given a parent on /dashboard/timeline
When they type "Quran" in the search box
Then only observations containing "Quran" in the text are shown

**Combined Filters**:
Given a parent on /dashboard/timeline
When they select dimension "Islamic" AND sentiment "Positive" AND search "Fajr"
Then only Islamic observations with positive sentiment containing "Fajr" are shown

---

### F-007: Dimension Detail View

**Academic Detail Page**:
Given a parent navigating to /dashboard/dimensions/academic
Then they see:
- A header showing "Academic" with the dimension icon
- A trend graph showing the last 6 months of observation counts and sentiment
- A list of all Academic observations (paginated, 20 per page)
- The Academic milestone checklist for the child's age band

**Trend Graph**:
Given a child with observations over the last 4 months
When the parent views /dashboard/dimensions/academic
Then the trend graph shows monthly bars for observation count
And a line for positive sentiment percentage
And months with no observations show zero

---

### F-008: Basic Settings

**Update Profile**:
Given a parent on /dashboard/settings
When they change their name and click Save
Then the name updates across the application

**Change Password**:
Given a parent on /dashboard/settings
When they enter their current password and a new password (meeting requirements)
Then the password is updated
And all existing sessions except the current one are invalidated

**Notification Preferences**:
Given a parent on /dashboard/settings/notifications
When they select "Weekly digest" and save
Then they receive a weekly email summarising their children's recent observations and milestone progress

**Delete Account**:
Given a parent on /dashboard/settings
When they click "Delete Account" and type "DELETE" to confirm
Then all their data (account, children, observations, milestones) is marked for deletion
And they are logged out
And data is permanently deleted within 30 days

---

## 9. Out of Scope

**Explicitly NOT included in MVP**:
- AI-powered insights or recommendations (Phase 2)
- Multi-child comparative family dashboard (Phase 2)
- Goal setting and tracking (Phase 2)
- Progress report generation/PDF export (Phase 2)
- Photo/media attachments on observations (Phase 2)
- Reminders and notification prompts to log observations (Phase 2)
- Teacher or tutor collaboration features
- Community features or forums
- Gamification or child-facing features
- Mobile app (iOS/Android)
- Arabic or other non-English language support
- Google/Apple OAuth (email/password only for MVP)
- Quran audio recitation recording
- Integration with school systems
- Automated developmental concern flagging
- Real-time collaboration (multiple parents editing simultaneously)
- Offline mode
- Data import from other apps
- Custom milestones (parents use pre-defined only in MVP)

---

## 10. Dependencies

**External Services**:
- **Email Service**: SendGrid or AWS SES for transactional emails (welcome, password reset, weekly digest)
- **Image Storage**: S3-compatible storage for child profile photos (can use local filesystem for MVP)
- **Authentication**: Custom JWT implementation (no OAuth providers in MVP)

**Infrastructure**:
- **Database**: PostgreSQL 15+ (database: muaththir_dev)
- **Backend**: Fastify (port 5005)
- **Frontend**: Next.js 14+ (port 3108)
- **ORM**: Prisma
- **Hosting**: To be determined (likely Vercel + Render or Railway)

**Data**:
- **Milestone Definitions**: A seed dataset of 240+ milestones (10 per dimension per age band) must be authored and loaded into the database before launch. This is original content, not sourced from copyrighted developmental assessment tools. Milestones should be informed by general child development literature and Islamic educational principles.

---

## 11. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Milestone content quality is inadequate or culturally insensitive | High -- undermines core value proposition | Medium | Have milestones reviewed by Islamic educators and child development professionals before launch. Iterate based on early user feedback. |
| Parents find observation logging too time-consuming and stop using the app | High -- retention collapse | Medium | Keep observation form to 3 fields (dimension, text, sentiment). Offer quick-log from dashboard. Target <1 minute per observation. |
| Radar chart scoring feels arbitrary or inaccurate to parents | Medium -- loss of trust in the dashboard | Medium | Document the scoring formula transparently. Allow parents to understand what affects each axis. Iterate the formula based on feedback. |
| Islamic dimension excludes non-Muslim families or feels alienating | Medium -- limits addressable market | Low | Position dimensions 1-4 and 6 as universal. Make Islamic dimension optional during onboarding. Clear messaging that the platform works for any family. |
| Privacy concerns about storing children's developmental data in the cloud | High -- prevents adoption | Medium | End-to-end encryption for child data at rest. Clear privacy policy. GDPR and COPPA-aligned practices. No third-party data sharing. Option to self-host in future. |
| Insufficient milestone coverage across all dimensions and age bands | Medium -- milestones feel incomplete or generic | Medium | Launch with 10+ milestones per dimension per age band (240+ total). Prioritise Islamic and Academic dimensions where parent expectations are highest. |
| Low engagement in less-familiar dimensions (Aspirational, Social-Emotional) | Medium -- radar chart skews to 2-3 dimensions | High | Provide example observations and guidance prompts for each dimension. Highlight under-observed dimensions with gentle nudges on dashboard. |
| Free tier is too generous, preventing paid conversion | Medium -- revenue shortfall | Low | Free tier limited to 1 child profile (MVP) with upgrade prompt. Monitor conversion rates and adjust. |
| Competitor launches similar product targeting Muslim families | Low -- market share loss | Low | First-mover advantage + deep Islamic integration that surface-level competitors cannot replicate. Community trust is a moat. |

---

## 12. Monetization Details

### Pricing Tiers

| Tier | Price | Children | Observations | Features |
|------|-------|----------|-------------|----------|
| Free | $0 | 1 child | Unlimited | 6-dimension dashboard, observations, milestones, timeline |
| Premium | $8/month | Unlimited | Unlimited | All Free features + unlimited children, export data, email digests, priority support |

### Revenue Model

- Primary revenue: Monthly subscriptions (Premium tier)
- No advertising; child data is never monetised
- Annual billing option at 20% discount: $77/year
- No transaction fees or hidden costs

### Free Tier Economics

- 1 child profile is enough to evaluate the product for a single child but insufficient for families with multiple children (most target users have 2-4 children)
- Cost per free user: approximately $0.02/month (server + database costs per user)
- Target: 8:1 free-to-paid ratio sustains unit economics
- Natural upgrade trigger: second child drives conversion

---

## 13. Timeline

**MVP Development** (5 weeks):
- Week 1: Backend foundation (auth, database schema, API structure, child profiles)
- Week 2: Observation logging API, milestone data model and seed data, radar chart calculation engine
- Week 3: Frontend foundation (Next.js app, dashboard layout, radar chart component, observation form)
- Week 4: Dimension detail pages, milestone checklists UI, timeline page, settings
- Week 5: Integration testing, onboarding flow, landing page, polish, security hardening

**MVP Launch** (Week 6):
- Deploy to production
- Onboard first 30 beta families (from Muslim parenting communities)
- Collect feedback, iterate on milestone content and radar chart scoring

**Phase 2** (Weeks 7-12):
- AI-powered insights
- Multi-child family dashboard
- Goal setting
- Progress report generation
- Photo/media attachments
- Reminders

**Milestones**:
- **Week 2**: Observation logging works end-to-end, radar chart calculates from real data
- **Week 3**: Full dashboard with all 6 dimension views functional
- **Week 4**: Complete milestone checklists loaded, timeline with filtering works
- **Week 5**: Onboarding flow complete, all tests passing, security reviewed
- **Week 6**: MVP launched with 30 beta families

---

## 14. Open Questions

**For Architect**:
- [ ] What charting library should we use for the radar chart? (Chart.js, Recharts, D3, or a custom SVG?)
- [ ] How should milestone seed data be structured and loaded? (Prisma seed script, SQL migration, or JSON fixtures?)
- [ ] Should radar chart scores be pre-calculated and cached, or computed on every request?

**For CEO**:
- [ ] Should the free tier be limited to 1 child or 2 children?
- [ ] Should we allow parents to create custom milestones in MVP, or only pre-defined ones?
- [ ] What level of detail is expected for milestone guidance text? (Brief tip vs. detailed explanation with Islamic references?)
- [ ] Should the weekly email digest be a Phase 2 feature to reduce MVP scope?

**For Islamic Content Advisor**:
- [ ] Can we source milestone guidance from established Islamic education curricula (e.g., Tarbiyah Project, Yaqeen Institute)?
- [ ] What is the appropriate level of Islamic terminology to use in the UI for a bilingual English/Arabic audience?
- [ ] Should we include specific hadith or Quranic references in milestone guidance text?

**For Legal**:
- [ ] What disclaimers are needed regarding developmental milestone information? (We are not medical professionals.)
- [ ] What COPPA considerations apply when parents store children's information?
- [ ] Do we need consent mechanisms for children old enough to understand data collection (age 13+)?

---

## 15. Glossary

- **Dimension**: One of the 6 developmental areas tracked by Mu'aththir (Academic, Social-Emotional, Behavioural, Aspirational, Islamic, Physical)
- **Observation**: A parent's written record of something they noticed about their child, tagged to a dimension with a sentiment indicator
- **Milestone**: A pre-defined developmental achievement appropriate for a specific age band and dimension
- **Age Band**: One of 4 developmental stages: Early Years (3-5), Primary (6-9), Upper Primary (10-12), Secondary (13-16)
- **Radar Chart / Spider Chart**: A hexagonal chart with 6 axes showing a child's holistic development profile
- **Sentiment**: A parent's classification of an observation as positive, neutral, or needs_attention
- **Tarbiyah**: Arabic term for holistic upbringing/education, encompassing both worldly and spiritual dimensions
- **Ihsan**: Excellence, doing one's best in all things; a concept that spans all 6 dimensions
- **Sabr**: Patience and perseverance; relevant to behavioural and aspirational dimensions
- **Akhlaq**: Character and manners; core to the Social-Emotional and Islamic dimensions
- **Tajweed**: Rules governing the correct recitation of the Quran
- **Surah**: A chapter of the Quran (114 total)
- **Fajr/Isha**: Dawn and night prayers, two of the five daily Islamic prayers
- **Dua**: Personal supplication/prayer to Allah
- **Khushu**: Mindful presence and concentration during prayer
- **Seerah**: The biography and life example of Prophet Muhammad (peace be upon him)

---

**End of Document**
