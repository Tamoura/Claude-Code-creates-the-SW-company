# Product Brief: AI GPU Usage Calculator

## Vision

**One sentence**: A web-based Total Cost of Ownership (TCO) calculator that helps AI startups estimate and compare GPU computing costs across all major cloud providers.

## Problem Statement

AI startups struggle to estimate their GPU infrastructure costs. Pricing is complex, varies wildly between providers, and involves multiple components (compute, storage, networking). Teams often overspend or under-provision because they lack tools to model their actual workloads.

## Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| AI/ML Engineers | Technical folks planning infrastructure | Accurate cost estimates for training jobs |
| Startup Founders | Decision makers with budget constraints | Compare providers, optimize spend |
| DevOps/Platform | Infrastructure planners | Model inference costs at scale |

## Core Features (High Level)

1. **Training Cost Calculator** - Estimate GPU costs for model training (model size, dataset, epochs)
2. **Inference Cost Calculator** - Estimate serving costs (requests/sec, latency requirements)
3. **Storage Cost Calculator** - Dataset and model storage costs
4. **Networking Cost Calculator** - Data transfer and egress costs
5. **Provider Comparison** - Side-by-side comparison across providers

## Supported Providers

**Major Clouds:**
- AWS (EC2 P4d, P5, G5, Inf2)
- Google Cloud (A100, H100, TPUs)
- Microsoft Azure (NC, ND series)

**GPU Specialists:**
- Lambda Labs
- RunPod
- Vast.ai
- CoreWeave

## Success Criteria

- Users can get a cost estimate in under 2 minutes
- Estimates are within 20% of actual costs
- Clean, simple UI that doesn't require cloud expertise

## Constraints

- **Technical**: Must work without backend initially (client-side calculations OK for MVP)
- **Business**: Open source, no monetization - focus on utility
- **Scope**: MVP = calculator only, no accounts, no saving (keep it simple)

## Monetization

None. Fully free and open source. Goal is community goodwill and establishing ConnectSW reputation.

## Initial Thoughts

- Pricing data can be embedded (updated periodically) rather than real-time API
- Single page app is fine for MVP
- Mobile-responsive important (founders check costs on phones)

---

*Completed by: CEO*
*Date: 2025-01-25*
