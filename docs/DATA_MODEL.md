# Data model

Types live in `src/types`.

## PaymentEvent (`payment.ts`)
`id, merchantId, type (SALE|REFUND|TRANSFER|SETTLEMENT|CHARGEBACK), amount, eventTime, settleTime?, ingestTime, payerRef, payerHash, destHash, payerState, linkedSaleId?, beneficiaryHash?, channel, linkId?, orderId?, source`

- Three clocks are kept apart: event, settle and ingest time.
- `payerRef` is a synthetic raw identifier retained only to demonstrate hashing; production stores hashes only.
- `source` carries lineage.

## Scenario and MerchantProfile (`merchant.ts`)
A scenario bundles a profile, events (including cohort peers), weekly volume series, fixtures, a coverage map, website data (embeds and catalogue), orders, verification sample, bank credits and a graph specification.
Coverage keys: `acquiring, website, orders, bank, fulfillment, calendar, verification`, each AVAILABLE, PARTIAL or MISSING.

## EvidenceItem (`evidence.ts`)
`id, name, family (A–I), status (ILLICIT|BENIGN|UNKNOWN), strength, reliability, fakeDifficulty, lineage, system, affinity per mechanism, observed, expected, explanation, metrics, records, requires`

## Investigation types (`investigation.ts`)
`InvestigationResult` holds layer outputs (L1 counts and coverage, L2 weekly rows and CUSUM, evidence, cohort matches, fusion result, analyst review, per-layer timelines). `UserState` holds the analyst's notes, chosen response level, authority checks, label and audit entries.

## Synthetic generators
`frontend/src/data/transactions.ts` uses a seeded PRNG (mulberry32). Seeds: bakery 1103, rotation 2207, fabricated 3319, Diwali 4421. Event ids are assigned `TX0001…` after chronological sorting.
