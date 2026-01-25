# AI GPU Usage Calculator - Product Requirements Document

**Version**: 1.0
**Last Updated**: 2025-01-25
**Author**: Product Manager Agent
**Status**: Draft

---

## 1. Overview

### 1.1 Vision Statement

The AI GPU Usage Calculator is a free, open-source web application that enables AI startups and ML practitioners to quickly estimate and compare GPU computing costs across all major cloud providers. In under 2 minutes, users can input their workload parameters and receive a comprehensive Total Cost of Ownership (TCO) breakdown including compute, storage, and networking costs. By providing transparent, accurate cost estimates, we help teams make informed infrastructure decisions without vendor lock-in or pricing confusion.

### 1.2 Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| Fast time-to-estimate | Time from page load to complete estimate | < 2 minutes |
| Estimation accuracy | Variance from actual provider costs | Within 20% |
| User adoption | Monthly active users | 1,000 within 3 months |
| Open source engagement | GitHub stars | 100 within first month |

### 1.3 Scope

**In Scope (MVP):**
- Training cost calculator (model size, dataset, epochs)
- Inference cost calculator (requests/sec, latency)
- Storage cost calculator (datasets, model checkpoints)
- Networking cost calculator (data transfer, egress)
- Provider comparison view (side-by-side)
- 7 supported providers (AWS, GCP, Azure, Lambda Labs, RunPod, Vast.ai, CoreWeave)
- Static/embedded pricing data
- Mobile-responsive design
- Client-side calculations (no backend required)

**Out of Scope (MVP):**
- User accounts or authentication
- Saving/exporting estimates
- Real-time pricing APIs
- Historical price tracking
- Custom provider configurations
- Multi-region optimization
- Reserved instance/spot pricing optimization
- Backend server or database
- API for programmatic access

---

## 2. User Personas

### 2.1 Alex - AI/ML Engineer

| Attribute | Details |
|-----------|---------|
| **Role** | Senior ML Engineer at Series A startup |
| **Goals** | Get accurate cost estimates for upcoming training runs; avoid budget surprises |
| **Pain Points** | Spends hours reading provider docs; gets surprised by hidden costs (egress, storage) |
| **Tech Savviness** | High |
| **Usage Frequency** | Weekly during planning phases |

**Quote**: "I just want to know if training this 7B model will cost me $500 or $5,000 before I submit the job."

### 2.2 Sarah - Startup Founder

| Attribute | Details |
|-----------|---------|
| **Role** | Technical co-founder, AI-first B2B SaaS |
| **Goals** | Compare providers for best value; justify infrastructure spend to investors |
| **Pain Points** | Overwhelmed by pricing complexity; needs quick answers for board meetings |
| **Tech Savviness** | Medium-High |
| **Usage Frequency** | Monthly during planning/fundraising |

**Quote**: "I need to show our investors a realistic infrastructure cost projection for the next 12 months."

### 2.3 Marcus - DevOps/Platform Engineer

| Attribute | Details |
|-----------|---------|
| **Role** | Platform Engineer responsible for ML infrastructure |
| **Goals** | Model inference costs at scale; plan for production workloads |
| **Pain Points** | Inference costs scale unpredictably; hard to estimate networking overhead |
| **Tech Savviness** | High |
| **Usage Frequency** | Weekly to monthly |

**Quote**: "If we hit 1M requests/day, what's this actually going to cost us across different providers?"

---

## 3. User Stories & Requirements

### 3.1 Epic: Training Cost Estimation

#### US-001: Estimate Training Costs by Model Parameters

**Story**: As an ML engineer, I want to input my model size and training parameters so that I can estimate GPU compute costs for a training run.

**Acceptance Criteria**:
- [ ] Given I am on the training calculator, when I enter model size (parameters in billions), then I see recommended GPU configurations
- [ ] Given I have entered model parameters, when I specify dataset size (GB) and epochs, then I see estimated training hours
- [ ] Given training hours are calculated, when I view results, then I see cost breakdown per provider
- [ ] Given I enter invalid inputs (negative numbers, non-numeric), then I see clear validation errors

**Priority**: P0 (Must Have)

**Notes**: Model size determines memory requirements which constrains GPU selection. Use standard benchmarks for FLOPS calculations.

---

#### US-002: Select GPU Type for Training

**Story**: As an ML engineer, I want to select or be recommended appropriate GPU types so that my cost estimate reflects realistic hardware choices.

**Acceptance Criteria**:
- [ ] Given I am configuring training, when I view GPU options, then I see available GPUs per provider (H100, A100, etc.)
- [ ] Given my model size, when the system recommends GPUs, then recommendations match memory requirements
- [ ] Given I select a GPU, when I view the estimate, then pricing reflects that specific GPU type
- [ ] Given a provider doesn't offer a GPU type, when I view results, then that provider shows "Not Available" for that config

**Priority**: P0 (Must Have)

**Notes**: GPU availability varies by provider. H100, A100, A10, L4 are primary options.

---

#### US-003: Configure Multi-GPU Training

**Story**: As an ML engineer, I want to specify multi-GPU configurations so that I can estimate distributed training costs.

**Acceptance Criteria**:
- [ ] Given I am configuring training, when I select GPU count (1, 2, 4, 8), then cost scales appropriately
- [ ] Given I need more than 8 GPUs, when I specify multi-node, then I can enter number of nodes
- [ ] Given multi-GPU config, when I view results, then I see per-node and total costs clearly separated

**Priority**: P0 (Must Have)

**Notes**: Multi-GPU training has networking overhead. MVP can use simple linear scaling; v2 could add efficiency factors.

---

### 3.2 Epic: Inference Cost Estimation

#### US-004: Estimate Inference Costs by Request Volume

**Story**: As a platform engineer, I want to estimate inference costs based on expected request volume so that I can plan production serving infrastructure.

**Acceptance Criteria**:
- [ ] Given I am on the inference calculator, when I enter requests per second (or per day), then I see GPU utilization estimates
- [ ] Given I specify model size and batch size, when I calculate, then I see recommended GPU count and type
- [ ] Given request volume and GPU config, when I view results, then I see monthly cost per provider
- [ ] Given I enter 0 or negative requests, then I see appropriate validation messages

**Priority**: P0 (Must Have)

**Notes**: Inference costs depend heavily on batch size and latency requirements.

---

#### US-005: Specify Latency Requirements

**Story**: As a platform engineer, I want to specify latency requirements so that GPU recommendations account for performance needs.

**Acceptance Criteria**:
- [ ] Given I am configuring inference, when I select latency tier (real-time <100ms, standard <500ms, batch >1s), then GPU recommendations adjust
- [ ] Given stricter latency requirements, when I view costs, then estimates reflect need for faster/more GPUs
- [ ] Given latency tier selected, when hovering on info icon, then I see explanation of what each tier means

**Priority**: P1 (Should Have)

**Notes**: Real-time = more GPUs with lower utilization. Batch = fewer GPUs with higher utilization.

---

### 3.3 Epic: Storage Cost Estimation

#### US-006: Calculate Dataset Storage Costs

**Story**: As an ML engineer, I want to estimate dataset storage costs so that I understand the full cost of my training pipeline.

**Acceptance Criteria**:
- [ ] Given I am calculating storage, when I enter dataset size in GB/TB, then I see monthly storage costs
- [ ] Given dataset size entered, when I view per-provider breakdown, then I see object storage pricing (S3, GCS, etc.)
- [ ] Given I specify storage duration (months), when I calculate, then total cost reflects duration

**Priority**: P0 (Must Have)

**Notes**: Use standard object storage tiers. MVP focuses on primary/hot storage.

---

#### US-007: Calculate Model Checkpoint Storage

**Story**: As an ML engineer, I want to estimate checkpoint storage costs so that I budget for model artifacts during training.

**Acceptance Criteria**:
- [ ] Given I am in training config, when I specify checkpoint frequency and model size, then I see checkpoint storage estimates
- [ ] Given checkpoint config, when I view total storage, then it sums dataset + checkpoint storage
- [ ] Given I don't want checkpoints, when I set frequency to "none", then checkpoint storage is $0

**Priority**: P1 (Should Have)

**Notes**: Checkpoints = model_size * num_checkpoints. Large models can have significant checkpoint costs.

---

### 3.4 Epic: Networking Cost Estimation

#### US-008: Calculate Data Egress Costs

**Story**: As a platform engineer, I want to estimate data egress costs so that I understand networking expenses for inference serving.

**Acceptance Criteria**:
- [ ] Given I am calculating inference costs, when I specify average response size (KB), then egress is calculated
- [ ] Given requests/sec and response size, when I view results, then monthly egress GB and cost are shown
- [ ] Given I view provider comparison, when egress is significant, then I see it highlighted as a cost driver

**Priority**: P0 (Must Have)

**Notes**: Egress varies significantly by provider. Can be major cost for high-volume inference.

---

#### US-009: Calculate Data Ingress for Training

**Story**: As an ML engineer, I want to estimate data transfer costs for uploading training data so that I understand one-time setup costs.

**Acceptance Criteria**:
- [ ] Given I specify dataset size, when I calculate training, then I see one-time ingress cost (usually $0 but varies)
- [ ] Given multi-region scenario, when flagged, then inter-region transfer costs are shown

**Priority**: P2 (Nice to Have)

**Notes**: Most providers have free ingress. Include for completeness.

---

### 3.5 Epic: Provider Comparison

#### US-010: Compare Costs Across All Providers

**Story**: As a startup founder, I want to see a side-by-side comparison of all providers so that I can make an informed decision quickly.

**Acceptance Criteria**:
- [ ] Given I have completed a cost configuration, when I view results, then I see all 7 providers compared
- [ ] Given comparison view, when I look at costs, then total TCO is prominently displayed per provider
- [ ] Given comparison view, when I look at breakdown, then compute/storage/network are shown separately
- [ ] Given a provider can't support the config, when displayed, then it shows "Not Available" with reason

**Priority**: P0 (Must Have)

**Notes**: This is the core value prop. Make comparison scannable and clear.

---

#### US-011: Sort and Filter Provider Results

**Story**: As a user, I want to sort providers by cost or filter by availability so that I can quickly find the best option.

**Acceptance Criteria**:
- [ ] Given comparison results, when I click "Sort by Cost", then providers reorder lowest to highest
- [ ] Given comparison results, when I toggle "Hide Unavailable", then providers without config support are hidden
- [ ] Given I have filtered/sorted, when I change inputs, then filters persist

**Priority**: P1 (Should Have)

**Notes**: Default sort should be by total cost ascending.

---

#### US-012: View Provider Details

**Story**: As an ML engineer, I want to see detailed breakdowns per provider so that I understand what I'm paying for.

**Acceptance Criteria**:
- [ ] Given a provider in comparison, when I click to expand, then I see detailed cost breakdown
- [ ] Given expanded view, when I look at GPU details, then I see specific GPU model, hourly rate, and hours
- [ ] Given expanded view, when I look at storage, then I see per-GB rate and total GB
- [ ] Given expanded view, when I look at network, then I see egress rate and total GB

**Priority**: P1 (Should Have)

**Notes**: Detailed view helps users validate and explain estimates.

---

### 3.6 Epic: User Experience

#### US-013: Quick Start with Presets

**Story**: As a first-time user, I want quick-start presets so that I can get an estimate without knowing all the parameters.

**Acceptance Criteria**:
- [ ] Given I land on the calculator, when I view the form, then I see preset buttons (e.g., "7B Model Training", "LLM Inference API")
- [ ] Given I click a preset, when the form populates, then all fields have reasonable defaults
- [ ] Given I use a preset, when I adjust values, then the preset label clears indicating custom config
- [ ] Given presets are available, when I hover on one, then I see a tooltip explaining the use case

**Priority**: P1 (Should Have)

**Notes**: Presets reduce friction. Include 3-4 common scenarios.

---

#### US-014: Responsive Mobile Experience

**Story**: As a startup founder, I want to use the calculator on my phone so that I can check costs on the go.

**Acceptance Criteria**:
- [ ] Given I open the calculator on mobile, when I view the page, then all elements are readable without horizontal scroll
- [ ] Given mobile view, when I enter inputs, then form fields are appropriately sized for touch
- [ ] Given mobile comparison view, when I view results, then providers stack vertically with clear separation
- [ ] Given mobile, when I tap a provider, then detail expansion works smoothly

**Priority**: P0 (Must Have)

**Notes**: Founders often check costs during meetings or travel.

---

#### US-015: Clear Input Validation

**Story**: As any user, I want clear validation feedback so that I know when my inputs are incorrect.

**Acceptance Criteria**:
- [ ] Given I enter invalid input, when I leave the field, then I see an inline error message
- [ ] Given required fields are empty, when I try to calculate, then missing fields are highlighted
- [ ] Given numeric fields, when I enter non-numeric values, then the input is rejected or flagged
- [ ] Given validation errors exist, when I correct them, then error messages clear immediately

**Priority**: P0 (Must Have)

**Notes**: Good UX is essential for utility tools.

---

#### US-016: Understand Calculation Methodology

**Story**: As a technical user, I want to understand how costs are calculated so that I can trust the estimates.

**Acceptance Criteria**:
- [ ] Given I am on the results page, when I click "How is this calculated?", then I see methodology explanation
- [ ] Given methodology view, when I read it, then I understand the formulas used
- [ ] Given methodology view, when I check pricing sources, then I see when pricing data was last updated
- [ ] Given methodology view, when I want more detail, then I see link to documentation

**Priority**: P1 (Should Have)

**Notes**: Transparency builds trust. Include pricing date and formulas.

---

## 4. User Flows

### 4.1 Primary Flow: Training Cost Estimate

**Trigger**: User wants to estimate training costs for a model

```
[Land on Calculator Home]
        |
        v
[Select "Training" Tab]
        |
        v
[Enter Model Parameters]
(size, dataset, epochs, GPU config)
        |
        +-- [Optional: Use Preset] --> [Form Pre-populated]
        |
        v
[Click "Calculate"]
        |
        +-- [Validation Errors?] --> [Show Errors, Stay on Form]
        |
        v (No Errors)
[View Comparison Results]
        |
        +-- [Click Provider] --> [View Detailed Breakdown]
        |
        v
[User Has Cost Estimate]
```

**Happy Path**: User enters parameters, clicks calculate, views comparison, identifies best provider.

**Error Cases**:
- Invalid inputs: Show inline validation, prevent calculation
- No providers available for config: Show message explaining why (e.g., model too large)

---

### 4.2 Secondary Flow: Inference Cost Estimate

**Trigger**: User wants to estimate inference serving costs

```
[Land on Calculator Home]
        |
        v
[Select "Inference" Tab]
        |
        v
[Enter Inference Parameters]
(model size, requests/sec, latency tier)
        |
        v
[Click "Calculate"]
        |
        +-- [Validation Errors?] --> [Show Errors]
        |
        v (No Errors)
[View Comparison Results with Inference + Egress]
        |
        v
[User Has Cost Estimate]
```

**Happy Path**: User enters volume and latency needs, gets monthly estimate across providers.

**Error Cases**:
- Unrealistic request volume: Show warning but allow calculation
- No providers meet latency requirements: Show partial results with explanations

---

## 5. Functional Requirements

### 5.1 Calculation Engine

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-001 | Calculate training GPU hours from model size, dataset, and epochs | P0 | Use standard FLOPS benchmarks |
| FR-002 | Calculate inference GPU requirements from requests/sec and latency | P0 | Include batch size in calculation |
| FR-003 | Calculate storage costs from dataset + checkpoint sizes | P0 | Use provider object storage rates |
| FR-004 | Calculate egress costs from response size and request volume | P0 | Provider-specific egress rates |
| FR-005 | Sum all cost components into Total Cost of Ownership | P0 | TCO = compute + storage + network |
| FR-006 | Handle multi-GPU and multi-node configurations | P0 | Linear scaling for MVP |

### 5.2 Provider Data

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-007 | Store pricing for AWS GPU instances (P4d, P5, G5, Inf2) | P0 | On-demand rates |
| FR-008 | Store pricing for GCP GPU instances (A100, H100, L4) | P0 | On-demand rates |
| FR-009 | Store pricing for Azure GPU instances (NC, ND series) | P0 | On-demand rates |
| FR-010 | Store pricing for Lambda Labs GPUs | P0 | Standard rates |
| FR-011 | Store pricing for RunPod GPUs | P0 | Community cloud rates |
| FR-012 | Store pricing for Vast.ai GPUs | P0 | Market average rates |
| FR-013 | Store pricing for CoreWeave GPUs | P0 | On-demand rates |
| FR-014 | Include storage and egress rates per provider | P0 | Object storage + egress |
| FR-015 | Display pricing last-updated date | P1 | Transparency |

### 5.3 User Interface

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-016 | Provide tab-based navigation (Training / Inference) | P0 | Clear mode switching |
| FR-017 | Display side-by-side provider comparison | P0 | 7 providers compared |
| FR-018 | Enable sorting of providers by cost | P1 | Default: lowest first |
| FR-019 | Show expandable detail view per provider | P1 | Click to expand |
| FR-020 | Provide quick-start presets | P1 | 3-4 common scenarios |
| FR-021 | Show methodology/calculation explanation | P1 | Trust building |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P01 | Initial page load time | < 2 seconds |
| NFR-P02 | Calculation response time | < 500ms (client-side) |
| NFR-P03 | Bundle size | < 500KB gzipped |

### 6.2 Security

| ID | Requirement |
|----|-------------|
| NFR-S01 | No user data collection or storage |
| NFR-S02 | No external API calls with user inputs |
| NFR-S03 | HTTPS enforced in production |

### 6.3 Accessibility

| ID | Requirement |
|----|-------------|
| NFR-A01 | WCAG 2.1 AA compliance |
| NFR-A02 | Keyboard navigation support for all interactions |
| NFR-A03 | Screen reader compatible form labels and results |
| NFR-A04 | Sufficient color contrast ratios |

### 6.4 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-R01 | Static site uptime (via CDN) | 99.9% |
| NFR-R02 | Works offline after initial load | Yes (PWA optional for v2) |

### 6.5 Browser Support

| ID | Requirement |
|----|-------------|
| NFR-B01 | Chrome (last 2 versions) |
| NFR-B02 | Firefox (last 2 versions) |
| NFR-B03 | Safari (last 2 versions) |
| NFR-B04 | Edge (last 2 versions) |
| NFR-B05 | Mobile Safari and Chrome |

---

## 7. Data Requirements

### 7.1 Data Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| Provider | Cloud/GPU provider info | id, name, logo, website |
| GPUType | GPU model specifications | id, name, memory_gb, provider_id, hourly_rate |
| StorageRate | Provider storage pricing | provider_id, per_gb_month |
| EgressRate | Provider egress pricing | provider_id, per_gb, free_tier_gb |
| Preset | Quick-start configurations | id, name, description, training_config, inference_config |

### 7.2 Data Storage

| Data Type | Storage | Update Frequency |
|-----------|---------|------------------|
| Provider pricing | Static JSON/TS file | Monthly manual update |
| GPU specifications | Static JSON/TS file | As new GPUs released |
| Presets | Static JSON/TS file | As needed |

### 7.3 Data Retention

No user data is collected or retained. All calculations are performed client-side.

---

## 8. Integration Requirements

### 8.1 External Systems

| System | Purpose | Type | Priority |
|--------|---------|------|----------|
| None | MVP has no external dependencies | N/A | N/A |

**Note**: MVP is entirely client-side with static pricing data. Future versions may integrate provider pricing APIs.

---

## 9. Release Plan

### MVP (Phase 1)

**Goal**: Deliver a functional TCO calculator with training and inference cost estimation for 7 providers.

**Features Included**:
- US-001: Estimate Training Costs by Model Parameters
- US-002: Select GPU Type for Training
- US-003: Configure Multi-GPU Training
- US-004: Estimate Inference Costs by Request Volume
- US-006: Calculate Dataset Storage Costs
- US-008: Calculate Data Egress Costs
- US-010: Compare Costs Across All Providers
- US-014: Responsive Mobile Experience
- US-015: Clear Input Validation

**Estimated Effort**: 2-3 weeks

---

### Phase 2 (Post-MVP)

**Goal**: Enhance usability and add advanced features.

**Features Included**:
- US-005: Specify Latency Requirements
- US-007: Calculate Model Checkpoint Storage
- US-009: Calculate Data Ingress for Training
- US-011: Sort and Filter Provider Results
- US-012: View Provider Details
- US-013: Quick Start with Presets
- US-016: Understand Calculation Methodology
- Export estimates (PDF/CSV)
- Shareable URL with encoded parameters

---

### Phase 3 (Future)

**Goal**: Add advanced capabilities and integrations.

**Potential Features**:
- Spot/preemptible pricing comparison
- Reserved instance cost modeling
- Real-time pricing API integration
- User accounts and saved estimates
- Cost alerts and monitoring integration
- Multi-region optimization

---

## 10. Success Metrics

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| Time to Estimate | Time from page load to viewing results | < 2 minutes | Analytics event tracking |
| Estimation Accuracy | Comparison to actual provider invoices | Within 20% | User feedback surveys |
| Monthly Active Users | Unique visitors per month | 1,000+ in 3 months | Google Analytics |
| GitHub Stars | Open source engagement | 100+ in first month | GitHub metrics |
| Bounce Rate | Users who leave without calculating | < 40% | Google Analytics |
| Provider Coverage | % of configs with all 7 providers priced | > 80% | Internal testing |

---

## 11. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Pricing data becomes stale | High | Medium | Display "last updated" date prominently; establish monthly update process |
| Calculations are inaccurate | Medium | High | Document methodology; allow community feedback; validate against real costs |
| GPU availability changes | Medium | Low | Mark GPUs as "limited availability" when known; update data regularly |
| Low user adoption | Medium | Medium | Focus on SEO; share in AI/ML communities; keep UX extremely simple |
| Scope creep beyond MVP | High | Medium | Strict MVP definition; defer all nice-to-haves to Phase 2 |
| Provider adds/removes GPU types | Medium | Low | Modular pricing data structure for easy updates |

---

## 12. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should we include TPU pricing for GCP? | Product | Open - Recommend: Yes in Phase 2 |
| 2 | How to handle spot/preemptible pricing in MVP? | Product | Resolved - Exclude from MVP |
| 3 | What presets should be included? | Product | Open - Suggest: 7B Training, 70B Training, LLM API Serving, Image Model Serving |
| 4 | How often should pricing data be updated? | DevOps | Resolved - Monthly updates |
| 5 | Should we track analytics? | Product | Open - Recommend: Basic GA4 for usage patterns |

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| TCO | Total Cost of Ownership - complete cost including compute, storage, and networking |
| Egress | Data transfer out of a cloud provider's network |
| Ingress | Data transfer into a cloud provider's network |
| Epoch | One complete pass through the training dataset |
| Checkpoint | Saved model state during training for recovery or evaluation |
| Inference | Using a trained model to make predictions |
| Latency | Time between request and response |
| FLOPS | Floating Point Operations Per Second - measure of compute power |
| On-demand | Pay-as-you-go pricing without commitment |
| Spot/Preemptible | Discounted pricing for interruptible workloads |

### B. GPU Reference Data

| GPU | Memory | Typical Providers | Use Case |
|-----|--------|-------------------|----------|
| NVIDIA H100 | 80GB | AWS, GCP, Azure, CoreWeave, Lambda | Large model training, high-performance inference |
| NVIDIA A100 | 40/80GB | All providers | Standard training and inference |
| NVIDIA A10 | 24GB | AWS, GCP, RunPod | Cost-effective inference |
| NVIDIA L4 | 24GB | GCP, CoreWeave | Inference optimization |
| NVIDIA T4 | 16GB | All providers | Budget inference |

### C. Calculation Formulas (Reference)

**Training Hours Estimate**:
```
training_flops = 6 * model_params * dataset_tokens * epochs
hours = training_flops / (gpu_flops * utilization * num_gpus)
```

**Inference GPU Requirement**:
```
tokens_per_second = requests_per_sec * avg_tokens_per_request
gpus_needed = ceil(tokens_per_second / tokens_per_gpu_per_second)
```

**Monthly Egress Cost**:
```
monthly_egress_gb = requests_per_month * avg_response_kb / 1024 / 1024
egress_cost = max(0, monthly_egress_gb - free_tier_gb) * per_gb_rate
```

### D. References

- [Product Brief](/notes/briefs/gpu-calculator.md)
- AWS Pricing: https://aws.amazon.com/ec2/pricing/
- GCP Pricing: https://cloud.google.com/compute/gpus-pricing
- Azure Pricing: https://azure.microsoft.com/pricing/details/virtual-machines/
- Lambda Labs Pricing: https://lambdalabs.com/service/gpu-cloud
- RunPod Pricing: https://www.runpod.io/gpu-instance/pricing
- Vast.ai Pricing: https://vast.ai/pricing
- CoreWeave Pricing: https://www.coreweave.com/pricing

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CEO | | | |
| Product Manager | Agent | 2025-01-25 | |
