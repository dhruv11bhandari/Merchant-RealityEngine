# Architecture

## Seven layers

| Layer | Job | Code |
|---|---|---|
| L1 Ingest & Lineage | Normalise feeds into `PaymentEvent`, classify, separate timestamps, link refunds, hash identifiers, build the coverage map | `data/transactions.ts`, `engines/investigationEngine.ts` (`layer1`), `layers/L1Ingestion` |
| L2 Merchant Profile | Declared profile and three baselines (anchored, seasonal, rolling) | `engines/residualEngine.ts`, `engines/cusumEngine.ts`, `layers/L2MerchantProfile` |
| L3 Detection | Transparent detectors over nine families, emitting `EvidenceItem` | `engines/detectors.ts`, `engines/cohortContinuity.ts` |
| L4 Evidence Fusion | Dedupe, exclude UNKNOWN, weight, independence gate, mechanism scores | `engines/evidenceFusion.ts` |
| L5 Analyst Review | Legitimate chain versus front chain, inspection, findings | `engines/analystEngine.ts`, `layers/L5AnalystReview` |
| L6 Governed Response | Six levels, authority gate, HoldRecord, action audit | `engines/responseEngine.ts` |
| L7 Audit, Labels & Learning | Labels, indicators, reliability updates, hash-chained audit | `engines/learningEngine.ts` |

## Key formulas

- Residual: `R_t = (V_t − E_t) / max(E_t, ε)`, ε = 1.
- CUSUM: `S_t = max(0, S_{t−1} + R_t − k)`, k = 0.1, alarm when S_t > 0.5.
- Pre-match alignment (C5): share of match-day sales in the 45 minutes before a start, divided by the share in the same clock window on non-match days (with +0.5/+1 smoothing). Illicit if lift ≥ 3 and z ≥ 3.
- Effective weight: illicit = `strength × reliability`; benign = `strength × reliability × (0.35 + 0.65 × fakeDifficulty)`.
- Mechanism score: `1 − exp(−0.5 × Σ weight × affinity)` over counted illicit evidence.
- Case gate: at least two independent evidence families (each with illicit mass ≥ 0.25) drawing on at least two source systems.
- Cohort continuity: `.35 payer overlap + .20 ticket shape + .15 timing shape + .20 lifecycle handoff + .10 shared beneficiary`.

## Fusion rules

1. UNKNOWN is excluded from scoring (missing data is not evidence).
2. Signals with the same family, lineage and status collapse to the strongest (for example A1 and A4 read the same ticket data; D7 and D9 read the same refund ledger).
3. Benign evidence is discounted when it is cheap to fake.
4. Independence is judged by family and by source system.
5. Hypotheses are ranked, never declared.

## Design inspirations

Quantexa (contextual graphs), LexisNexis Risk Solutions and Metro Bank (behavioural monitoring), HCLTech SIM-box detection (identifier rotation), Airbnb Trust & Safety (intended use, proportionate intervention), PayPal and Palantir (connected investigations). These are inspirations only. No partnership, endorsement or use of proprietary technology is implied.
