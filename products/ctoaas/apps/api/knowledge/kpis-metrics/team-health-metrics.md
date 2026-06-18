# Team Health and Retention Metrics

Team health is the most underinvested area of engineering measurement. Organizations obsess over delivery metrics and code quality while ignoring the system that produces both: the humans. Unhealthy teams produce brittle code, miss deadlines, lose institutional knowledge through attrition, and create a doom loop where the remaining engineers inherit more load, burn out faster, and leave. This guide covers how to measure team health rigorously, detect problems early, and intervene before attrition becomes your primary engineering constraint.

## When to Use / When NOT to Use

| Use These Metrics When | Do NOT Use These Metrics When |
|---|---|
| Attrition has increased and you need to understand why | As surveillance — tracking individual burnout scores and acting on them punitively |
| You are scaling the team and want to monitor health through growth | You are in the middle of layoffs — health metrics will be meaningless until the org stabilizes |
| A team is underperforming and you suspect people issues, not technical ones | You want to avoid hard conversations — metrics supplement but do not replace 1:1 discussions |
| Preparing for a reorg and need baseline data | Your organization has trust issues — surveys will produce unreliable data without psychological safety |
| Building a case for engineering investment in developer experience | As a substitute for actually talking to your engineers |

## The Metrics

### 1. Voluntary Attrition Rate

**What it measures:** The percentage of employees who choose to leave within a given period.

**Formula:**

```
Voluntary Attrition Rate = (Voluntary departures in period / Average headcount in period) x 100
```

**Benchmarks:**

| Context | Healthy | Concerning | Critical |
|---|---|---|---|
| Overall tech industry (2024) | 8-12% annually | 13-18% | >18% |
| Senior engineers (5+ years) | 5-8% | 9-12% | >12% |
| First-year employees | 15-20% | 21-30% | >30% |

**Why it matters beyond the obvious:** Every departure costs 1.5-2x the departing employee's annual salary. But the hidden cost is worse: knowledge loss, team disruption, remaining team morale impact, and the 6-12 month ramp-up for a replacement. A team running at 20% attrition is effectively always in onboarding mode.

**Segment it:** Overall attrition numbers hide critical patterns. Break down by tenure (first-year attrition is a hiring or onboarding problem), by team (one team at 30% while others are at 8% points to a management problem), by level (senior attrition is more damaging than junior), and by performance rating (regretted vs non-regretted attrition).

### 2. Employee Net Promoter Score (eNPS)

**What it measures:** How likely employees are to recommend their team or company as a place to work.

**Formula:**

```
eNPS = % Promoters (9-10) - % Detractors (0-6)
```

Score range: -100 to +100.

**Benchmarks:**

| Score | Interpretation |
|---|---|
| +40 to +100 | Exceptional — strong employer brand, high retention likely |
| +10 to +39 | Good — most people are satisfied with room to improve |
| -10 to +9 | Concerning — significant portion of dissatisfied employees |
| Below -10 | Critical — attrition wave likely within 3-6 months |

**How to run it:** Anonymous quarterly survey. One question: "On a scale of 0-10, how likely are you to recommend [team/company] as a place to work for a friend?" Follow with one open-ended question: "What is the primary reason for your score?" The open-ended responses are where the actionable insights live.

**Critical rule:** Never try to identify who gave which score. The moment anonymity is compromised, the data becomes worthless. Use a third-party survey tool, not an internal form where admins could theoretically trace responses.

### 3. Onboarding Time and Time-to-Productivity

**What it measures:** How long it takes a new hire to become an effective contributor.

**Formulas:**

```
Onboarding Time = Date of first unassisted production contribution - Start date

Time to Full Productivity = Date engineer reaches team-average output metrics - Start date
```

**Benchmarks:**

| Metric | Good | Average | Poor |
|---|---|---|---|
| First meaningful PR merged | Within 2 weeks | 2-4 weeks | >4 weeks |
| Contributing independently | 1-2 months | 2-4 months | >4 months |
| Fully productive | 3-4 months | 4-6 months | >6 months |

**Why it matters:** Long onboarding times compound the cost of attrition. If it takes 6 months to become productive and your average tenure is 2 years, you spend 25% of each employee's tenure in ramp-up mode. Improving onboarding from 6 months to 3 months is equivalent to adding 12.5% more effective engineering capacity without hiring anyone.

**How to improve it:** Assign a dedicated onboarding buddy (not the manager). Provide a curated list of starter tasks that introduce the codebase progressively. Document tribal knowledge that currently lives only in people's heads. Measure and iterate — ask every new hire at 30, 60, and 90 days what was confusing, what was helpful, and what was missing.

### 4. Span of Control and IC-to-Manager Ratio

**What it measures:** How many direct reports each engineering manager has, and the overall ratio of individual contributors to managers.

**Benchmarks:**

| Metric | Optimal | Acceptable | Problematic |
|---|---|---|---|
| Direct reports per manager | 5-8 | 4-10 | <4 or >10 |
| IC-to-manager ratio | 6:1 to 8:1 | 5:1 to 10:1 | <5:1 (top-heavy) or >10:1 (under-managed) |

**Why span matters:** Managers with fewer than 4 reports tend to micromanage and add unnecessary process overhead. Managers with more than 10 reports cannot provide meaningful 1:1s, career development, or performance feedback. Both extremes correlate with higher attrition.

**Why ratio matters:** A ratio below 5:1 means you are spending too much of your engineering budget on management overhead. A ratio above 10:1 means managers are stretched too thin, and team health problems will go undetected until they become crises.

### 5. Burnout Indicators

Burnout is not a single metric — it is a syndrome detectable through a constellation of signals.

**Leading indicators (detect before burnout hits):**

| Signal | How to Detect | Threshold |
|---|---|---|
| Working hours creep | Git commit timestamps, login data (anonymized/aggregated) | >10% of commits outside business hours, trending up |
| PTO usage decline | HR system data | Below 60% of available PTO used |
| Meeting overload | Calendar analysis (aggregated) | >20 hours/week in meetings for ICs |
| On-call burden | PagerDuty/OpsGenie data | >1 week of on-call per month, or frequent overnight pages |
| Unplanned work ratio | Sprint data | >30% of work is unplanned/interrupt-driven |
| Satisfaction score drop | Pulse surveys | eNPS drop of 10+ points in a single quarter |

**Lagging indicators (burnout is already happening):**

| Signal | How to Detect |
|---|---|
| Increased sick days | HR data (aggregated, not individual) |
| Decreased PR quality (more revisions needed) | Code review data |
| Withdrawal from team activities | Manager observation, peer feedback |
| Cynicism in retros/surveys | Qualitative survey analysis |
| Performance rating decline | Calibration data |

**How to act on burnout data:** Aggregate and anonymize. Present to leadership as team-level trends, never individual reports. If a specific team shows multiple burnout signals, the intervention is with the team's manager and workload, not with individual engineers.

### 6. The Spotify Squad Health Check Model

Spotify's model is the most widely adopted team health assessment framework in tech. It works by having teams self-assess across predefined dimensions using a traffic light system.

**Dimensions (adapted for engineering teams):**

| Dimension | Green | Yellow | Red |
|---|---|---|---|
| Easy to release | Releasing is simple, safe, and painless | Releasing is possible but has friction | Releasing is painful, scary, or infrequent |
| Suitable process | Our process helps us work effectively | Process is okay but we work around parts of it | Process actively hinders our work |
| Tech quality (health of codebase) | We are proud of our code and it is easy to maintain | Some areas are messy but it is manageable | Technical debt is significantly slowing us down |
| Value | We deliver stuff that customers and stakeholders love | Some things we ship are valuable, some are questionable | We regularly deliver things nobody asked for or uses |
| Speed | We get things done quickly, no unnecessary waiting | We are not slow but there is room to improve | We never seem to finish things, everything takes forever |
| Mission | We know exactly why we exist and our work is exciting | We kind of understand our purpose | We have no idea why this team exists or what matters most |
| Fun | We love working here | It is fine, not great, not terrible | Coming to work is dreading |
| Learning | We are learning constantly and growing | We learn sometimes but it is not a focus | We do not learn anything new, we are stagnating |
| Support | We always get help when we need it and help others | Help is available but sometimes hard to get | We are on our own, nobody helps and nobody asks |
| Teamwork | We work together effectively with high trust | Collaboration works mostly but has gaps | Silos, conflict, or avoidance — we do not function as a team |

**How to run it:**

1. Schedule a 60-90 minute session quarterly (not more often — the overhead becomes a health problem itself).
2. For each dimension, the team votes green/yellow/red anonymously.
3. Facilitate a discussion for any dimension with significant red or yellow votes.
4. Identify one or two dimensions to actively improve in the next quarter.
5. Track results over time to show trends.

**Key rule:** The health check is a conversation tool, not a reporting tool. Do not roll up squad health results into a management dashboard that ranks teams. The moment teams feel judged by their scores, they will inflate them.

### 7. Exit Interview Analysis

**What it measures:** Patterns in why people actually leave.

**How to do it well:** Conduct 1-2 weeks before departure (not the last day). Use consistent questions for pattern analysis. Have someone other than the departing employee's manager conduct it. Track themes in a structured database, not unstructured notes.

**Core questions:** (1) What prompted you to start looking? (2) What could we have done differently? (3) Rate your manager 1-5 on communication, career development, technical leadership, advocacy. (4) What is the single biggest improvement this team could make? (5) Would you consider returning?

**Pattern analysis:** Categorize exit reasons: compensation, career growth, management, culture, work-life balance, technical stagnation, lack of impact. If "management" or "career growth" appears in more than 40% of exits, you have a systemic problem.

## Real-World Examples

**Spotify** created and open-sourced their Squad Health Check model in 2014. They run it quarterly across hundreds of squads. The key insight from their experience: the trend matters more than any single snapshot. A team that goes from green to yellow on "fun" two quarters in a row needs attention, even if yellow seems fine in isolation.

**Google's Project Aristotle** studied 180 teams and found psychological safety was the strongest predictor of effectiveness — influencing how companies now prioritize safety and trust metrics over pure productivity signals.

**Atlassian** developed a Team Health Monitor tracking eight attributes. Their research found teams with consistently green health scores delivered 24% more features per quarter than teams with mixed scores.

## Decision Framework

**Start with eNPS when:**
You have no team health data and need a quick, low-overhead baseline. One question, quarterly, provides a starting point.

**Start with the Squad Health Check when:**
You want to empower teams to self-diagnose and improve. Best for organizations with strong facilitation skills and a culture of psychological safety.

**Start with attrition analysis when:**
You are already losing people and need to understand why urgently. Combine exit interview analysis with tenure and team-level segmentation.

**Start with burnout indicators when:**
You suspect teams are overworked but nobody is saying it out loud. Leading indicators from tooling data (working hours, on-call burden) can surface problems without requiring anyone to self-report.

**Use all of them when:**
You are a VP of Engineering or CTO building a comprehensive people strategy. Layer them: eNPS as the top-level signal, health checks as the team-level diagnostic, burnout indicators as the early warning system, and attrition analysis as the lagging validation.

## Common Mistakes

**Running surveys but never sharing results.** If engineers take time to provide feedback and never hear what happened as a result, participation drops to near zero within two quarters. Always close the loop: share aggregate results, acknowledge the top concerns, and name the specific actions you are taking.

**Treating health checks as performance reviews.** The moment a team's health check score affects their manager's performance review, every team will report green. Health checks must be safe spaces for honest assessment.

**Aggregating away the signal.** An organization-wide eNPS of +25 can hide a single team at -40. Always look at team-level data, not just org-level averages.

**Measuring attrition without segmenting.** Losing a 2-year senior engineer with deep domain knowledge is fundamentally different from losing a 6-month junior who was a poor fit. Track regretted vs non-regretted attrition separately.

**Ignoring the manager layer.** Research consistently shows that people leave managers, not companies. If your attrition is clustered under specific managers, no amount of perks or compensation adjustment will fix it. Address the management problem directly.

**Surveying too often.** Monthly pulse surveys work. Weekly surveys do not — they become noise that engineers resent and ignore. Quarterly in-depth surveys plus monthly 3-question pulses is the right cadence for most organizations.

**Confusing correlation with causation in exit data.** When departing employees say "I left for more money," that is often the proximate cause, not the root cause. People who are engaged and growing do not take recruiter calls in the first place. Dig deeper.

## Key Metrics to Track (Meta-Metrics)

| Meta-Metric | Why It Matters | Target |
|---|---|---|
| Survey response rate | Low rates mean your data is unreliable or trust is broken | >75% for quarterly surveys |
| eNPS trend direction | Whether the organization is getting better or worse | Positive quarter-over-quarter trend |
| Time from signal to action | How quickly leadership responds to health concerns | Action plan within 2 weeks of identified concern |
| Action item completion | Whether committed improvements actually happen | >60% of health-check action items completed within one quarter |
| Exit interview participation | Whether departing employees trust the process enough to share honestly | >80% of voluntary departures complete an exit interview |
| Manager training coverage | Whether managers are equipped to support team health | 100% of new managers complete people management training within 90 days |

## References

1. Spotify Engineering. (2014). "Squad Health Check Model." Spotify Labs Blog.
2. Duhigg, C. (2016). "What Google Learned From Its Quest to Build the Perfect Team." *The New York Times Magazine*.
3. Google re:Work. (2015). "Guide: Understand Team Effectiveness." https://rework.withgoogle.com
4. Maslach, C., & Leiter, M. P. (2016). "Understanding the Burnout Experience." *World Psychiatry*, 15(2).
5. Westrum, R. (2004). "A Typology of Organisational Cultures." *BMJ Quality & Safety*, 13(suppl 2).
6. Forsgren, N., Humble, J., & Kim, G. (2018). *Accelerate*. IT Revolution Press. (Chapter on culture and burnout)
7. Atlassian. (2022). "Team Health Monitor Playbook." https://www.atlassian.com/team-playbook/health-monitor
8. Gallup. (2023). "State of the Global Workplace Report." https://www.gallup.com/workplace/
