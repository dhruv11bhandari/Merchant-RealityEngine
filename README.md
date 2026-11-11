# Merchant Reality Engine (MRE)

An interactive prototype of a merchant-intelligence platform for Payment Aggregators and payment-risk teams.
It asks one question: **does this merchant behave like the business it claims to be?**

The project has three connected experiences:

- **Public website** (`/`, `/architecture`): the product story, the seven-layer architecture and the technology.
- **Guided demo** (`/demo/*`): four deterministic, prebuilt merchant scenarios. Run one and inspect all seven layers and its final result inside the demo.
- **AI Engine** (`/ai-engine/*`): a user workspace that starts empty. Upload one JSON dataset and run it to see only that dataset's findings. Choosing a new file clears the previous result.
- **Offline Python prototype** (`./start.sh prototype`): a separate synthetic-data experiment; its multi-merchant report is not part of the web app.
> **Everything is synthetic.** Merchants, transactions, websites, crawler snapshots and portfolio figures are fabricated and deterministic. Nothing is verified real-world evidence. There are no customers, partners or performance claims. The response design is a product proposal, not a statement of legal or regulatory requirements, and nothing freezes real money.

## Run it

Use `./start.sh` to start the web app (Node.js 20+). To run the separate offline Python prototype, install its dependencies with `python3 -m pip install -r prototype/requirements.txt` and run `./start.sh prototype`.

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
| `/demo` | Four prebuilt scenarios and their seven-layer demo results |
| `/demo/investigations` | Seven-layer run for the selected demo merchant |
| `/demo/portfolio` | Results for the four demo merchants only |
| `/demo/merchant`, `/demo/graph`, `/demo/detection`, `/demo/patterns` | Demo merchant profile and evidence views |
| `/demo/analyst`, `/demo/response`, `/demo/audit` | Simulated analyst review, response and audit |
| `/ai-engine` | Empty workspace before a user dataset is analyzed; latest uploaded result afterward |
| `/ai-engine/analyze` | Upload a merchant dataset and run the seven-layer analysis in the browser |
| `/ai-engine/portfolio` | The single latest uploaded analysis; empty before the first run |
| `/ai-engine/investigations`, `/ai-engine/merchant`, `/ai-engine/graph`, `/ai-engine/detection`, `/ai-engine/patterns` | Findings for the latest uploaded dataset only; require a completed run |
| `/ai-engine/analyst`, `/ai-engine/response`, `/ai-engine/audit` | Review and action tools scoped to the latest uploaded dataset only |

The old `/demo/upload` link redirects to `/ai-engine/analyze`. The demo's four-merchants scenario pages remain under `/demo`.

## Scenarios

| Scenario | What it shows | Expected result |
|---|---|---|
| Sweet Crumbs Bakery (default) | Betting collections behind a bakery | Case opened; transaction laundering leads; L3 disables one link, POS stays live |
| Merchant rotation | Dormant account replaced by a similar one | Case opened; rotation leads |
| Fabricated commercial substance | Online store that cannot substantiate sales | Case opened on four independent families; outcome stays unresolved |
| Legitimate Diwali growth | Real 3× festival surge | **No case opened.** The volume alarm is explained |

The demo and AI Engine use separate state. Demo pages show only their four built-in merchants. The AI Engine displays no demo merchants or sample datasets; it waits for a user JSON upload and runs that dataset through the browser seven-layer pipeline. Only the latest upload is kept while the workspace is open. The optional Python prototype uses its own committed synthetic CSV dataset and runs offline; its report is not served by the web app.

## How it works in brief

1. In the guided demo, deterministic generators (`frontend/src/data/transactions.ts`) create event stores from fixed seeds.
2. `runInvestigation` (`frontend/src/engines/investigationEngine.ts`) is a pure function: same scenario in, same result out.
3. Detectors compute their results from the records (residuals, CUSUM, round-number heaping, geographic mismatch, pre-match funding lift against a same-clock-time control, refund reconciliation, beneficiary changes, cohort continuity and more). Nothing about the final verdict is hard-coded.
4. Fusion collapses correlated signals, excludes UNKNOWN, weights by reliability and fake difficulty, applies the two-independent-family gate and ranks four mechanism hypotheses.
5. The UI reveals layer results progressively; the analyst, response and learning steps respond to your inputs.
6. The optional offline Python prototype in `prototype/` reads its own sample CSV feeds and applies hand-set evidence-family rules. It is separate from the user-upload workspace and is not a trained machine-learning model.

## Project layout

```text
package.json, package-lock.json, vite.config.ts, tsconfig.json, start.sh
frontend/
  index.html
  public/       static assets, sample datasets and flowchart assets
  src/
    components/
    data/
    engines/
    hooks/
    layers/
    pages/
    styles/
    types/
    utils/
backend/        reserved for a future API
docs/           project and data documentation
prototype/      separate offline Python experiment and generated output
scripts/        sample export and engine self-test
archive/legacy-frontend/  preserved, inactive root-level frontend copy
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
