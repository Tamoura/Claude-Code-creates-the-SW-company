# Review: msitarzewski/agency-agents

**Repository:** https://github.com/msitarzewski/agency-agents
**Stars:** 46.8k | **Forks:** 7k | **License:** MIT
**Reviewed:** 2026-03-16

## Summary

**The Agency** is a large, open-source collection of 120+ AI agent personality definitions organized into 12+ professional divisions. Each agent is a standalone Markdown file with YAML frontmatter containing identity, workflows, deliverables, and success metrics. It targets Claude Code but supports multi-tool integration (Cursor, Aider, Windsurf, Gemini CLI, etc.).

## Structure

| Division | Agent Count | Coverage |
|----------|-------------|----------|
| Engineering | 23 | Frontend, backend, mobile, AI/ML, DevOps, security, SRE, firmware, blockchain |
| Marketing | 25+ | Growth, content, social media (platform-specific), SEO, regional (Chinese platforms) |
| Sales | 8 | Outbound, discovery, deals, pipeline, proposals |
| Design | 8 | UI, UX research, UX architecture, brand, visual storytelling, accessibility |
| Testing | 8 | QA across multiple paradigms |
| Product | 5 | Sprint planning, trend research, feedback synthesis, behavioral nudges |
| Project Management | 6 | Agile, coordination |
| Support | 6 | Customer-facing, triage |
| Spatial Computing | 6 | XR, Vision Pro, WebXR |
| Specialized | 27 | Blockchain audit, compliance, cultural intelligence, MCP builder, workflow architect |

## What They Do Well

### 1. Deep Specialization Over Generic Templates
Each agent has genuine domain depth. The Security Engineer references OWASP Top 10, CWE Top 25, STRIDE, zero-trust, and defense-in-depth with real nginx/CSP configurations. The Backend Architect specifies concrete targets (sub-200ms p95, 10x traffic handling). This is not "you are a helpful backend developer."

### 2. Personality-Driven Design
Agents have distinct voices and communication styles. The Code Reviewer operates as "a mentor, not a gatekeeper" with a 3-tier priority system (blockers/suggestions/nits). The Whimsy Injector adds creative playfulness. This differentiation helps models adopt genuine behavioral differences rather than superficially varied rephrases of the same generic assistant.

### 3. Deliverable-Focused Outputs
Agents specify what they produce: threat model documents, CSS design systems, architecture specifications, CI/CD pipeline configs. This is critical - it turns vague "help me with security" into structured output templates.

### 4. Measurable Success Metrics
Agents include quantified targets: "sub-48-hour remediation," "zero credential commits," "100% PR security scanning." This grounds agent behavior in observable outcomes rather than aspirational language.

### 5. Breadth of Coverage
The collection covers nearly every function a software company needs, plus niche areas like Chinese social media platforms (Douyin, Xiaohongshu, WeChat Mini Programs), spatial computing, and blockchain security auditing.

### 6. MIT License + Active Community
46.8k stars, 210 commits, active PRs and issues. Clear CONTRIBUTING.md with quality standards. The project is alive and evolving.

## Weaknesses and Gaps

### 1. No Orchestration Layer
The agents are standalone personalities with no coordination mechanism. There is no equivalent of ConnectSW's Orchestrator that routes work, manages dependencies between agents, or enforces workflow ordering. The `agents-orchestrator.md` in specialized/ is just another agent persona, not a routing/coordination system.

### 2. No Inter-Agent Communication Protocol
Agents don't reference each other. The Backend Architect doesn't know the Security Engineer exists. There's no handoff protocol, no shared artifact format, no dependency graph. In ConnectSW, the Orchestrator + agent-message schema + direct-delivery protocol solve this.

### 3. No Quality Gates or Enforcement
No equivalent of spec-first development, TDD requirements, testing gates, or CI enforcement articles. The agents describe what they do but nothing enforces that they actually do it or validates completeness.

### 4. Personality Over Process
The emphasis on "vibe" and personality traits is engaging but can be counterproductive. An agent described as "pragmatic, no-nonsense" may still hallucinate or skip steps without structural guardrails. ConnectSW's anti-rationalization protocol (Article XI) addresses this explicitly; agency-agents does not.

### 5. No Shared Context or Memory
No equivalent of Context Hub, progressive disclosure, or context compression protocols. Each agent starts fresh with no accumulated knowledge, no component registry to check, no prior decisions to reference.

### 6. Inconsistent Depth
The engineering agents (Backend Architect, Security Engineer) are substantially deeper than some marketing/sales agents that read more like job descriptions than actionable system prompts. Some agents in specialized/ feel like proof-of-concepts rather than production-ready definitions.

### 7. No Traceability
No requirement IDs, no spec references, no audit trail. When an agent produces output, there's no mechanism to trace it back to a requirement or validate it against acceptance criteria.

## Relevance to ConnectSW

### What We Can Learn

1. **Agent personality differentiation** - ConnectSW agent definitions could benefit from more distinctive voices and communication styles. Currently our agents are functionally differentiated but personality-neutral.

2. **Niche agent coverage** - The Chinese social media agents (Douyin, Xiaohongshu, WeChat) and spatial computing agents cover markets we haven't considered. Relevant for future product expansion.

3. **Contributing model** - Their CONTRIBUTING.md with clear agent design requirements (narrow specialization, concrete examples, measurable metrics) is a good template for if/when we open-source our agent definitions.

4. **Deliverable templates** - Some agents include actual code/config templates (nginx security headers, GitHub Actions workflows) that could be adapted into our Context Hub as reference material.

### What We Already Do Better

1. **Orchestration and coordination** - Our Orchestrator + agent hierarchy + message routing is a complete coordination layer they lack entirely.

2. **Quality enforcement** - Constitution articles, quality gates, anti-rationalization, spec-first development - none of this exists in agency-agents.

3. **Context engineering** - Progressive disclosure, context compression, Context Hub - our agents operate within a managed context system rather than standalone prompts.

4. **Traceability** - US-XX/FR-XXX requirement tracing, spec-kit workflow, CI enforcement of traceability.

5. **Process integration** - Our agents work within a defined SDLC (specify -> clarify -> plan -> tasks -> implement -> analyze). Their agents are standalone personas with no lifecycle.

### Potential Actions

| Action | Priority | Effort |
|--------|----------|--------|
| Audit ConnectSW agent personality differentiation against agency-agents examples | Low | Small |
| Extract useful deliverable templates (security headers, CI configs) into Context Hub | Low | Small |
| Evaluate Chinese market agents if Qabilah or future products target those platforms | Medium | Medium |
| Consider spatial computing agents if XR becomes a product direction | Low | Small |
| Use their CONTRIBUTING.md as reference for open-source agent contribution guidelines | Low | Small |

## Verdict

**agency-agents is an excellent collection of individual agent personas but lacks the systems-level infrastructure that makes a multi-agent company work.** It's a talent pool without a company. ConnectSW is the company - with process, coordination, quality gates, and lifecycle management.

The repo is most useful to ConnectSW as:
- **Inspiration** for agent personality depth and communication style
- **Reference** for niche domain coverage we haven't explored
- **Template library** for concrete deliverable formats

It is NOT a replacement for or threat to ConnectSW's agent architecture, which operates at a fundamentally different level of coordination and process maturity.
