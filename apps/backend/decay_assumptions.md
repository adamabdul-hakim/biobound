# Phase 4: Biological Decay Model Assumptions

## Mathematical Model

**Exponential decay formula:**
```
C(t) = C0 * e^(-k*t)
```

Where:
- `C(t)` = Chemical concentration at time t (relative, 0-100 scale)
- `C0` = Initial concentration (100 at year 0)
- `k` = Decay constant (rate parameter, units: per year)
- `t` = Time in years

## Baseline Decay Constants

### PFOA (Perfluorooctanoic Acid)
- **Estimated half-life**: 3.8 years (human serum, based on epidemiology)
- **Decay constant k**: 0.182 per year (ln(2) / 3.8 ≈ 0.182)
- **Rationale**: Long-lived compound, persists in organs, renal elimination dominant

### PFOS (Perfluorooctanesulfonate)
- **Estimated half-life**: 4.7-5.4 years (human serum)
- **Decay constant k**: 0.148 per year (ln(2) / 4.7 ≈ 0.148)
- **Rationale**: Most persistent PFAS compound, slow mobilization from tissues

### PTFE (Polytetrafluoroethylene / Teflon)
- **Estimated half-life**: 1.5-2.0 years (ingested particles, faster transit)
- **Decay constant k**: 0.347 per year (ln(2) / 2.0 ≈ 0.347)
- **Rationale**: Non-bioaccumulative in typical food contact scenarios, cleared via GI tract

### Generic PFAS (Trade names, suffix/prefix heuristics)
- **Default half-life**: 3.0 years (conservative middle ground)
- **Decay constant k**: 0.231 per year (ln(2) / 3.0 ≈ 0.231)
- **Rationale**: Used when specific chemical identity unclear

## Intervention Factors

### Dietary Intervention (Reduction of Exposure Source)
- **Precondition**: Safe to recommend (no contraindications present)
- **Effect**: Accelerates apparent decay by stopping additional exposure
- **Acceleration multiplier for k**: 1.5x
- **Interpretation**: Reducing new exposure allows natural excretion to dominate
- **Example**: Switching from nonstick cookware → k becomes 0.182 × 1.5 = 0.273

### Medical Contraindications
If medication interaction risk or underlying condition exists:
- Do NOT accelerate k
- Add warning to `medical_warnings` list
- Set `recommendation_safe: false` in response

## Boundary Conditions

### Time Horizons
Standard reporting years: `[2026, 2030, 2034]` (present, +4, +8 years)

### Minimum Level Clamp
Do not report levels below 5% (C_min = 5.0)
- Rationale: Below detection limits, clinical irrelevance

### Initial Condition
Always assume C0 = 100 at year 2026 (normalized 0-100 scale)

## Assumptions and Limitations

1. **Single exponential model**: Does not account for multi-compartment kinetics (blood vs tissue)
2. **Population average k**: Individual variability not modeled (age, metabolism, kidney function)
3. **Dietary intervention assumption**: Assumes complete source removal; gradual reduction not modeled
4. **No re-exposure**: Assumes no new exposure after intervention (unrealistic for water/food contamination at background levels)
5. **Linear recommendation**: No dose-response threshold modeling

## Future Refinements (Post-MVP)

- Multi-compartment model (blood, liver, kidney, adipose tissue)
- Age-adjusted k factors
- Gradual intervention (partial exposure reduction)
- Medication-specific interaction rules
- Probabilistic decay (confidence bounds)
