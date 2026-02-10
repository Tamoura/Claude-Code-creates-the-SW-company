# ADR-003: Sprint Risk Scoring Approach

## Status
Accepted

## Date
2026-02-07

## Context

Pulse's core differentiator is an AI-powered sprint risk score (0-100) that predicts whether a sprint is at risk of missing its goals. The system must generate both a numeric score and a natural language explanation of the top contributing factors.

**Requirements**:
- Risk score from 0 (no risk) to 100 (high risk)
- Color-coded: green (0-30), yellow (31-60), red (61-100) (US-05.1)
- Natural language explanation of top 3 factors (FR-15)
- Recommended actions when score > 60 (US-05.2)
- Recalculated every 4 hours during work hours (FR-16)
- Accuracy: >70% correlation with actual outcomes after 4 sprints of calibration (KPI)
- Must work from day 1 without training data

**Key Question**: Should we use a machine learning model or a rule-based weighted scoring system?

## Alternatives Considered

### Option A: Machine Learning Model
- **Approach**: Train a classification or regression model on historical sprint data. Features: velocity metrics, PR patterns, review patterns, commit frequency. Output: risk probability.
- **Pros**: Can discover non-obvious patterns, improves with more data, potentially higher accuracy over time, modern AI positioning.
- **Cons**: Requires training data (we have none at launch), needs ML infrastructure (model training, serving, retraining pipeline), black-box nature makes explanations difficult, cold start problem (no useful predictions until 10+ sprints of data), requires labeled outcomes (was the sprint successful?), expensive to operate.

### Option B: Rule-Based Weighted Scoring
- **Approach**: Define specific risk factors with known thresholds, assign weights, compute a weighted composite score. Explanation is template-based using factor values.
- **Pros**: Works from day 1 (no training data needed), fully explainable (each factor and weight is visible), easy to tune based on user feedback, no ML infrastructure required, deterministic (same inputs = same outputs), low computational cost.
- **Cons**: Cannot discover non-obvious patterns, limited to predefined factors, requires manual threshold tuning, may feel less "AI" to users.

### Option C: Hybrid (Rules Now, ML Later)
- **Approach**: Launch with rule-based scoring. Collect labeled data (sprint outcomes) over time. Introduce ML model in Phase 2 once sufficient data exists. Rule-based scoring remains as fallback and baseline.
- **Pros**: Ship immediately, collect data passively, upgrade to ML when ready, rule-based scoring validates which factors matter.
- **Cons**: Two systems to maintain eventually, migration risk.

## Decision

We choose **Option B (rule-based weighted scoring)** for MVP, with a clear path to **Option C (hybrid)** in Phase 2.

## Rationale

1. **Cold start problem**: ML models require substantial training data to produce useful predictions. Pulse has zero historical sprint data at launch. A rule-based system produces meaningful scores from day one using established software engineering heuristics.

2. **Explainability is the product**: Users do not just want a number; they want to understand why the risk is high and what to do about it. A rule-based system is inherently explainable: "Your risk is 72 because: PR review backlog is 5 PRs (impact: 20/100), velocity is 60% below sprint average (impact: 25/100), commit frequency dropped 40% today (impact: 15/100)." An ML model would need a separate explainability layer (SHAP/LIME) that adds complexity and may produce confusing explanations.

3. **Proven factors**: The risk factors we use are well-established engineering health signals:
   - Velocity trend relative to sprint average
   - PR review backlog (open PRs without review)
   - Cycle time trend
   - Commit frequency changes
   - Test coverage delta
   - Large PR ratio
   - Review load imbalance

   These factors have been validated by tools like LinearB, Jellyfish, and academic research on software development productivity.

4. **Tunable without retraining**: If a factor's weight is wrong, we adjust a number. No retraining, no data pipeline, no model deployment.

5. **Computational simplicity**: Risk calculation is a simple SQL query + arithmetic. It runs in <1 second. An ML model would require loading a model, running inference, and generating explanations, adding latency and infrastructure cost.

## Scoring Algorithm Design

### Risk Factors and Weights

| Factor | Weight | Threshold | Scoring |
|--------|--------|-----------|---------|
| Velocity Trend | 25% | <70% of sprint average pace | Linear: 100 at 0%, 0 at >=100% |
| PR Review Backlog | 20% | >3 PRs waiting >24h | Linear: 100 at 10+ PRs, 0 at 0 |
| Cycle Time Trend | 15% | >150% of 4-week avg | Linear: 100 at 300%, 0 at <=100% |
| Commit Frequency Drop | 15% | >40% drop day-over-day | Linear: 100 at 100% drop, 0 at 0% |
| Test Coverage Delta | 10% | >3% decrease from sprint start | Linear: 100 at 10% drop, 0 at 0% |
| Large PR Ratio | 10% | >30% of open PRs > 500 lines | Linear: 100 at 100%, 0 at 0% |
| Review Load Imbalance | 5% | >3:1 max/min ratio | Linear: 100 at 10:1, 0 at 1:1 |

### Score Computation
```
risk_score = min(100, sum(factor_score * factor_weight for each factor))
```

### Natural Language Explanation
Template-based with variable slots:
```
"Sprint risk is {score} ({level}). Top factors: {factor_1} ({detail_1}),
{factor_2} ({detail_2}), {factor_3} ({detail_3})."
```

Example:
```
"Sprint risk is 72 (high). Top factors: PR review backlog (5 PRs waiting
>24h, longest: PR #142 at 52h), velocity trend (only 4 of 12 expected PRs
merged with 3 days remaining), commit frequency drop (35% below sprint
average today)."
```

### Recommended Actions (when score > 60)
Generated from the top 3 factors using action templates:
- High review backlog: "Assign reviewer to PR #{number} -- open {hours} hours"
- Low velocity: "Consider reducing sprint scope by {points} story points based on current velocity"
- Coverage drop: "Review commit {sha} which reduced coverage by {delta}%"

## Consequences

### Positive
- Works from day 1 with zero training data
- Fully explainable and transparent to users
- Easy to tune weights based on user feedback
- No ML infrastructure cost
- Deterministic and testable
- Recommended actions are concrete and actionable

### Negative
- Cannot discover non-linear relationships between factors
- Weights are based on general heuristics, not optimized per team
- May miss team-specific risk patterns
- Positioning as "AI" is a stretch (it is heuristic, not learned)

### Risks
- Users may expect more sophisticated AI; mitigated by labeling as "AI Sprint Risk" and delivering genuinely useful predictions
- Weights may need frequent tuning; mitigated by making weights configurable (admin setting in Phase 2)
- Correlation target (>70%) may be hard to measure; mitigated by collecting sprint outcome data for future validation

## Future Evolution (Phase 2+)
1. Collect sprint outcome labels (team marks sprint as "on target" or "missed")
2. Use labeled data to validate factor weights
3. Train a simple model (logistic regression or gradient boosting) as a calibrator
4. Compare model predictions vs rule-based predictions
5. If model is significantly better, blend predictions (70% model, 30% rules)
6. Keep rule-based system as fallback and explainability layer
