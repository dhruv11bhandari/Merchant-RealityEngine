# Merchant Reality Engine (MRE)

An interactive prototype of a merchant-intelligence platform for Payment Aggregators and payment-risk teams.
It asks one question: **does this merchant behave like the business it claims to be?**

The project has two parts:

- **Public website** (`/`, `/architecture`): the product story, the seven-layer architecture and the technology.
- **Live demo** (`/demo/*`): a working simulation. Pick a scenario, run all seven layers, inspect every layer's input, processing and output, review the case as an analyst, apply a governed response and see the learning feedback.

> **Everything is synthetic.** Merchants, transactions, websites, crawler snapshots and portfolio figures are fabricated and deterministic. Nothing is verified real-world evidence. There are no customers, partners or performance claims. The response design is a product proposal, not a statement of legal or regulatory requirements, and nothing freezes real money.

## Run it

use start.sh for everyone in the team 

for chaman chelesani ( windows user ) :

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm run selftest   # run the engines on all four scenarios and print results
```

No API keys, accounts or network services are needed.

## Routes

| Route | What it is |
|---|---|
| `/` | Homepage: problem, approach, seven-layer explorer, technology, use cases, differentiation |
| `/architecture` | Architecture, design principles, prototype scope versus production |
| `/demo` | Overview and scenario launcher |
| `/demo/investigations` | Orchestrated run of L1–L7 with per-layer inspection |
| `/demo/merchant` | Merchant intelligence: profile and three baselines |
| `/demo/graph` | Evidence relationship graph |
| `/demo/detection` | L3 detection engine |
| `/demo/analyst` | L5 analyst workbench |
| `/demo/response` | L6 response centre |
| `/demo/audit` | L7 audit and learning |

## Scenarios

| Scenario | What it shows | Expected result |
|---|---|---|
| Sweet Crumbs Bakery (default) | Betting collections behind a bakery | Case opened; transaction laundering leads; L3 disables one link, POS stays live |
| Merchant rotation | Dormant account replaced by a similar one | Case opened; rotation leads |
| Fabricated commercial substance | Online store that cannot substantiate sales | Case opened on four independent families; outcome stays unresolved |
| Legitimate Diwali growth | Real 3× festival surge | **No case opened.** The volume alarm is explained |

Use the **Fast** toggle in the demo header to shorten the simulated processing time.

## How it works in brief

1. Deterministic generators (`frontend/src/data/transactions.ts`) create event stores from fixed seeds.
2. `runInvestigation` (`frontend/src/engines/investigationEngine.ts`) is a pure function: same scenario in, same result out.
3. Detectors compute their results from the records (residuals, CUSUM, round-number heaping, geographic mismatch, pre-match funding lift against a same-clock-time control, refund reconciliation, beneficiary changes, cohort continuity and more). Nothing about the final verdict is hard-coded.
4. Fusion collapses correlated signals, excludes UNKNOWN, weights by reliability and fake difficulty, applies the two-independent-family gate and ranks four mechanism hypotheses.
5. The UI reveals layer results progressively; the analyst, response and learning steps respond to your inputs.

## Project layout

```
frontend/
  index.html
  public/       static assets
  src/
  data/        merchants, scenarios, graphs, synthetic transaction generators, layer metadata
  engines/     residual, CUSUM, cohort continuity, detectors, fusion, analyst, response, learning
  layers/      L1–L7 views
  pages/       public and demo pages
  components/  ui, charts, graphs (React Flow), navigation, common
  hooks/       investigation context (orchestration and user state)
  types/       payment, merchant, evidence, investigation
backend/       reserved for a future API; this prototype has no backend
docs/          ARCHITECTURE, DEMO_GUIDE, DATA_MODEL, FUTURE_BACKEND
scripts/       selftest.ts
```

Stack: React 18, TypeScript, Vite, Tailwind CSS v4, Recharts, React Flow (`@xyflow/react`), Lucide, React Router.

## Known limitations

- 21 of the 112 catalogued detection patterns run as live detectors; the rest appear in the catalogue only.
- Fusion weights and thresholds are transparent heuristics, not calibrated models. No ML is trained.
- Website, domain-category and purchaser-verification data are fixtures. No external site is contacted.
- Graph layout is a simple radial layout from the merchant node.
- Portfolio indicators on the overview and audit pages are synthetic constants adjusted by the current run.
- In the rotation scenario, rotation leads transaction laundering by a small margin. That is deliberate: shared link hosting is genuinely ambiguous.
- The production bundle is a single chunk (~930 kB). Code-splitting is a straightforward later improvement.
