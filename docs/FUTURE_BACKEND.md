# Connecting a real backend

The engines are pure TypeScript functions over typed inputs, so they can move behind an API with little change.

| Concern | Prototype | Suggested production path |
|---|---|---|
| Ingestion | Seeded generators | Kafka topics per feed, schema registry, idempotent writers into PostgreSQL (or a column store) |
| Identifier hashing | FNV demo hash | Salted HMAC-SHA256, keys in a managed KMS, raw identifiers never stored |
| Profiles and baselines | Computed in the browser | Profile service with per-MCC priors and scheduled baseline jobs |
| Detectors | `engines/detectors.ts` | Python workers (FastAPI), one module per pattern family, same `EvidenceItem` contract |
| Graphs | Hand-authored per scenario | Entity resolution jobs writing to a graph store; NetworkX for analysis, Neo4j or similar for serving |
| Cohort continuity | Payer, ticket, timing, lifecycle, beneficiary | Add device and infrastructure features; candidate generation by blocking |
| Fusion | Heuristic weights | Calibrate on held-out adjudicated labels; keep the independence gate |
| Analyst workbench | Local state | Case management with assignment, SLAs, comments and evidence snapshots |
| Response | Simulated records | Integration with rails and legal workflow, maker-checker approvals, hard expiry on holds |
| Audit | Hash-chained list | Append-only store with external anchoring |
| Learning | Reliability nudges | Backtests, drift monitoring, model governance |

## Suggested API surface

- `POST /investigations` `{ merchantId }` → investigation id
- `GET /investigations/{id}` → `InvestigationResult`
- `POST /investigations/{id}/review` → analyst findings
- `POST /investigations/{id}/response` → response plan and authority checks
- `POST /investigations/{id}/label` → adjudicated label

## Principles to keep

UNKNOWN stays distinct from clean. A case requires independent evidence. Humans review before restrictive action. Actions are the narrowest effective scope, time-boxed and audited. Response levels must be mapped to the legal and contractual rules that apply to each deployment; this prototype does not assert what those rules are.
