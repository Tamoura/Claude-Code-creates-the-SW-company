# GPU Calculator Test Plan

## Overview

This document outlines the comprehensive testing strategy for the GPU Calculator Training Cost form. It includes user stories, test cases, and acceptance criteria for each form field.

**Last Updated**: 2026-01-26
**Version**: 1.0
**Author**: QA Engineer

---

## User Stories

### US-001: Model Size Input (modelSizeB)

**As a** user estimating training costs,
**I want to** input the model size in billions of parameters,
**So that** I can see how training costs scale with model complexity.

**Acceptance Criteria:**
- [ ] When I increase model size, training hours should increase proportionally
- [ ] When I increase model size, total cost should increase proportionally
- [ ] The field accepts decimal values (e.g., 7.5B)
- [ ] Minimum value is 0.1B
- [ ] Maximum reasonable value is 1000B (1 trillion parameters)

**Test Cases:**
| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| MS-01 | Default value | 7 | Shows valid configuration |
| MS-02 | Increase size | 7 -> 14 | Training hours double |
| MS-03 | Decrease size | 7 -> 3.5 | Training hours halve |
| MS-04 | Decimal input | 7.5 | Accepted and calculated |
| MS-05 | Zero value | 0 | Should show error or zero results |
| MS-06 | Negative value | -1 | Should show error or be rejected |
| MS-07 | Very large value | 1000 | Should calculate (may show very high hours) |

---

### US-002: Dataset Size Input (datasetSizeGb)

**As a** user estimating training costs,
**I want to** input the dataset size in gigabytes,
**So that** I can understand how data volume affects training time and cost.

**Acceptance Criteria:**
- [ ] When I increase dataset size, training hours should increase proportionally
- [ ] When I increase dataset size, total cost should increase proportionally
- [ ] The field accepts decimal values
- [ ] Minimum value is 0.1 GB
- [ ] Maximum reasonable value is 10,000 GB (10 TB)

**Test Cases:**
| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| DS-01 | Default value | 100 | Shows valid configuration |
| DS-02 | Double size | 100 -> 200 | Training hours double |
| DS-03 | Half size | 100 -> 50 | Training hours halve |
| DS-04 | Decimal input | 150.5 | Accepted and calculated |
| DS-05 | Zero value | 0 | Should show error or zero results |
| DS-06 | Negative value | -100 | Should show error or be rejected |
| DS-07 | Very large value | 10000 | Should calculate (may show very high hours) |

---

### US-003: Training Epochs Input (epochs)

**As a** user estimating training costs,
**I want to** specify the number of training epochs,
**So that** I can see how multiple passes over the data affect training time and cost.

**Acceptance Criteria:**
- [ ] When I increase epochs, training hours should increase proportionally
- [ ] When I increase epochs, total cost should increase proportionally
- [ ] The field accepts only whole numbers
- [ ] Minimum value is 1
- [ ] Maximum reasonable value is 100

**Test Cases:**
| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| EP-01 | Default value | 3 | Shows valid configuration |
| EP-02 | Triple epochs | 3 -> 9 | Training hours triple |
| EP-03 | Reduce epochs | 3 -> 1 | Training hours reduce to 1/3 |
| EP-04 | Zero value | 0 | Should show error or zero results |
| EP-05 | Negative value | -1 | Should show error or be rejected |
| EP-06 | Large value | 100 | Should calculate (may show very high hours) |
| EP-07 | Decimal value | 2.5 | Should round or reject |

---

### US-004: GPU Type Selection (gpuType)

**As a** user estimating training costs,
**I want to** select different GPU types,
**So that** I can compare training speeds and costs across hardware options.

**Acceptance Criteria:**
- [ ] When I select a faster GPU (H100 vs A100), training hours should decrease
- [ ] When I select a faster GPU, hourly rate typically increases but total may vary
- [ ] All available GPU options are selectable
- [ ] GPU type affects both time and cost calculations

**GPU Performance Reference:**
| GPU Type | TFLOPS | Relative Speed |
|----------|--------|----------------|
| H100-80GB | 1979 | 6.3x faster than A100 |
| A100-80GB | 312 | Baseline |
| A100-40GB | 312 | Same as A100-80GB |
| A10 | 125 | 2.5x slower than A100 |

**Test Cases:**
| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| GT-01 | Default type | A100-80GB | Shows valid configuration |
| GT-02 | Upgrade GPU | A100 -> H100 | Training hours decrease significantly |
| GT-03 | Downgrade GPU | A100 -> A10 | Training hours increase significantly |
| GT-04 | All options | Each GPU type | All calculate correctly |

---

### US-005: GPU Count Input (gpuCount)

**As a** user estimating training costs,
**I want to** specify the number of GPUs,
**So that** I can see how parallelization affects training time and cost.

**Acceptance Criteria:**
- [ ] When I increase GPU count, training hours should decrease proportionally
- [ ] When I increase GPU count, total cost may stay similar (more GPUs x fewer hours)
- [ ] Minimum value is 1
- [ ] Maximum reasonable value is 1000 GPUs

**Test Cases:**
| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| GC-01 | Default value | 8 | Shows valid configuration |
| GC-02 | Double GPUs | 8 -> 16 | Training hours halve |
| GC-03 | Halve GPUs | 8 -> 4 | Training hours double |
| GC-04 | Single GPU | 1 | Should calculate (may show high hours) |
| GC-05 | Zero value | 0 | Should show error or be rejected |
| GC-06 | Negative value | -1 | Should show error or be rejected |
| GC-07 | Large value | 1000 | Should calculate (may show very low hours) |

---

### US-006: Node Count Input (nodeCount)

**As a** user estimating training costs,
**I want to** specify the number of nodes (machines),
**So that** I can model multi-node distributed training scenarios.

**Acceptance Criteria:**
- [ ] When I increase node count, training hours should decrease proportionally
- [ ] Node count multiplies with GPU count (total GPUs = gpuCount x nodeCount)
- [ ] Minimum value is 1
- [ ] Maximum reasonable value is 100 nodes

**Test Cases:**
| ID | Scenario | Input | Expected Result |
|----|----------|-------|-----------------|
| NC-01 | Default value | 1 | Shows valid configuration |
| NC-02 | Add node | 1 -> 2 | Training hours halve |
| NC-03 | Multi-node | 1 -> 4 | Training hours reduce to 1/4 |
| NC-04 | Combined scaling | 8 GPUs, 2 nodes = 16 total | Same as 16 GPUs on 1 node |
| NC-05 | Zero value | 0 | Should show error or be rejected |
| NC-06 | Negative value | -1 | Should show error or be rejected |

---

## Test Categories

### 1. Unit Tests (trainingCalculator.test.ts)

Unit tests verify the pure calculation functions work correctly in isolation.

**Coverage Areas:**
- `calculateTrainingHours()` - Core time estimation
- `calculateTrainingCost()` - Full cost calculation with provider data
- Edge cases (zero, negative, boundary values)
- Scaling relationships (linear proportionality)

### 2. E2E Tests (calculator.spec.ts)

E2E tests verify the full user experience through the browser.

**Coverage Areas:**
- Form field visibility and interactivity
- Value changes update correctly
- Calculate button triggers calculation
- Results display correctly
- Responsive behavior

### 3. Visual Verification

Manual checks to ensure CSS/styling works correctly.

**Coverage Areas:**
- All inputs have visible borders
- Calculate button has proper background color
- Results display correctly formatted
- Mobile responsive layout

---

## Test Execution Matrix

| Field | Unit Tests | E2E Tests | Manual Verification |
|-------|------------|-----------|---------------------|
| modelSizeB | MS-01 to MS-07 | E2E-MS-01 to E2E-MS-03 | Visual check |
| datasetSizeGb | DS-01 to DS-07 | E2E-DS-01 to E2E-DS-03 | Visual check |
| epochs | EP-01 to EP-07 | E2E-EP-01 to E2E-EP-03 | Visual check |
| gpuType | GT-01 to GT-04 | E2E-GT-01 to E2E-GT-02 | Visual check |
| gpuCount | GC-01 to GC-07 | E2E-GC-01 to E2E-GC-03 | Visual check |
| nodeCount | NC-01 to NC-06 | E2E-NC-01 to E2E-NC-03 | Visual check |

---

## Acceptance Criteria Summary

For the calculator to pass the Testing Gate:

1. **All unit tests pass** - 100% of trainingCalculator tests
2. **All E2E tests pass** - 100% of calculator.spec.ts tests
3. **Each field has dedicated tests** - At least one test per field
4. **Edge cases covered** - Zero, negative, boundary values tested
5. **Visual verification passes** - Form renders correctly, button visible, inputs styled

---

## Bug Tracking

| ID | Field | Severity | Description | Status |
|----|-------|----------|-------------|--------|
| (none yet) | | | | |

---

## Test Results

### Unit Tests
- **Status**: PASS
- **Passed**: 100
- **Failed**: 0
- **Total**: 100
- **Test File**: `src/calculators/trainingCalculator.test.ts` (52 tests for training calculator)
- **Execution Time**: 1.98s

**Training Calculator Test Breakdown:**
- Form Field Tests: modelSizeB (7 tests)
- Form Field Tests: datasetSizeGb (7 tests)
- Form Field Tests: epochs (5 tests)
- Form Field Tests: gpuType (7 tests)
- Form Field Tests: gpuCount (6 tests)
- Form Field Tests: nodeCount (5 tests)
- Combined Parameter Tests (3 tests)
- Cost Calculation Tests (4 tests)
- Original tests (8 tests)

### E2E Tests
- **Status**: PASS
- **Passed**: 31
- **Failed**: 0
- **Total**: 31
- **Test File**: `e2e/calculator.spec.ts`
- **Execution Time**: 4.4 minutes

**E2E Test Breakdown:**
- GPU Calculator Core Tests (7 tests)
- Form Field Tests: modelSizeB (3 tests)
- Form Field Tests: datasetSizeGb (3 tests)
- Form Field Tests: epochs (3 tests)
- Form Field Tests: gpuType (3 tests)
- Form Field Tests: gpuCount (3 tests)
- Form Field Tests: nodeCount (3 tests)
- Combined Field Tests (2 tests)
- Visual Verification Tests (4 tests)

### Manual Verification
- **Status**: PASS
- **Dev Server**: Running on port 3100
- **Issues Found**: 0

**Checklist:**
- [x] App loads without errors
- [x] All buttons visible and styled (blue background)
- [x] All form inputs have visible borders
- [x] Layout renders correctly
- [x] All form fields accept values
- [x] Calculate button triggers calculation
- [x] Results display correctly

---

## Summary

**TESTING GATE PASSED - Ready for CEO checkpoint**

All tests pass:
- Unit tests: 100/100 PASS
- E2E tests: 31/31 PASS
- Visual verification: PASS
- Dev server: Running on port 3100

Each form field has dedicated tests:
- modelSizeB: 7 unit tests + 3 E2E tests
- datasetSizeGb: 7 unit tests + 3 E2E tests
- epochs: 5 unit tests + 3 E2E tests
- gpuType: 7 unit tests + 3 E2E tests
- gpuCount: 6 unit tests + 3 E2E tests
- nodeCount: 5 unit tests + 3 E2E tests

Edge cases are covered (zero values, boundary values, scaling proportionality).

---

*Test execution completed: 2026-01-26*
