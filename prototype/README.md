# Merchant Reality Engine (prototype)

Detects betting fronts hiding inside a payment aggregator's merchant base by checking whether a merchant's **actual payments still tell the story of the business it declared**. Built for the IIMB hackathon (PayU problem statement).

Everything runs on **synthetic data**. Merchant names, payers, UPI handles and websites are invented. The Diwali 2025 date is real; the cricket match calendar is a synthetic schedule.

## Run it

```bash
pip install -r requirements.txt     # pandas + numpy, nothing else
python run.py                        # generate data -> engine -> tests -> dashboard
```

Then open `out/dashboard.html` in a browser. It works offline.
`python run.py --fresh` regenerates the data. `python tests.py --seeds 8` re-checks every promise in 8 different random worlds.

## The demo story

| ID | Merchant | What's really going on | Engine result |
|---|---|---|---|
| M001 | Sharma Bakery & Cakes, Pune | Genuine. Big Diwali spike, local regulars | **L0** left alone. Spike matches similar shops |
| M002 | Royal Crust Bakery, Pune | Betting front from 5 Sep | **L3** proposed restriction. 5 evidence families agree |
| M003 | Tiffin Tales Cloud Kitchen | Genuine, growing fast | **L0**. Read as gradual organic growth |
| M004 | Lakshmi Kirana, Chennai | Genuine, but 4 data feeds missing | **L0**. Gaps listed as UNKNOWN, never held against it |
| M005 | Bright Minds Tuition | Genuine, started online classes | **L1** silent watch. Only one thing changed |
| M006–M020 | Background merchants | Genuine, seasonal | **L0** |

The two Pune bakeries are the demo moment: same city, same category, both busier in October. Only one is still a bakery.

## How it works (7 layers)

| Layer | File / function | What it does |
|---|---|---|
| L1 Ingest | `engine.ingest()` | Loads feeds, validates columns, drops and reports bad rows, builds a coverage map |
| L2 Profile | `engine.profile()` | Jul–Aug = approved baseline. Expected volume = baseline × median movement of similar shops that day |
| L3 Detect | `engine.fam_A` … `fam_G` | Six evidence families; each returns SUPPORTS_ILLICIT / SUPPORTS_BENIGN / UNKNOWN with the numbers |
| L4 Fuse | `engine.fuse_and_respond()` | Counts independent families (never UNKNOWNs), names the likely mechanism |
| L5 Review | dashboard "Analyst review" | A person confirms, dismisses or asks the merchant to explain |
| L6 Respond | `engine.LADDER` | L0 normal → L1 watch → L2 review → L3 restriction (needs sign-off) → L4 hold (**locked** behind legal gate) → L5 terminate + FIU-IND report |
| L7 Learn | dashboard labels | Labels feed the next threshold review (stored in browser for the demo) |

### Evidence families

| | Family | Type | Fires when (review window vs Jul–Aug) |
|---|---|---|---|
| A | Ticket size vs declared menu | soft | >5% of payments outside declared ₹ range, or round ₹500-multiples up >12 points |
| B | Payer geography & customer base | soft | >30% out-of-state payers and up >20 points |
| C | Match-time timing | soft | Match evenings bring >2x the money of other evenings and >15% of all value |
| D | Refund integrity | hard | ≥5 refunds with no matching earlier payment, >20% of refund value |
| F | Settlement & cash-out speed | hard | >50% of settled money withdrawn within 6 h, up >40 points |
| G | Checkout provenance | hard | >10% of payments start on sites the merchant never declared |

"Hard" = backed by processor/bank records a merchant can't easily stage.

### Three rules the code enforces
1. **Missing data = UNKNOWN.** It never adds to suspicion.
2. **One signal never acts.** Escalation needs 2+ independent families; a restriction needs 3+ including a hard one, plus analyst sign-off.
3. **Detect separately, act separately.** The engine proposes; settlement holds stay locked until there is a contract-specific legal basis.

## Robustness (what `tests.py` checks)

- All five scenario promises above, plus: no background merchant escalated, nothing ever auto-reaches L4/L5.
- The same promises hold across **8 independently generated random worlds**, so the thresholds aren't tuned to one dataset.
- **Messy input:** junk amounts, unreadable timestamps, duplicate IDs, payments for unknown merchants, a dormant merchant, a brand-new merchant, an unknown category, feed flags written as text. Nothing crashes, nobody is wrongly flagged, and every dropped row is reported.
- **A whole feed missing** (no settlements file): that family becomes UNKNOWN for everyone, the front is still caught, and no genuine merchant is flagged.
- **A required column missing:** a clear error naming the column, not a stack trace.
- If one merchant ever breaks the engine, that merchant goes to manual check and the rest of the run continues.

## Limits (say these before the judges do)

- Synthetic data. Real false-positive rates on Indian PA traffic must be measured in a shadow study before any action is automated.
- Thresholds are hand-set and explainable, not learned. With labels (L7), they would be tuned per category.
- A smart operator can shape the soft families (A–C). That's why restrictions require at least one hard family.
- Rotation across many merchant IDs (the 1xbet pattern) needs cross-merchant network checks, which this prototype doesn't include.

## Files

```
generate_data.py      synthetic merchants, payments, refunds, settlements, calendar
engine.py             the 7-layer engine -> out/results.json
tests.py              acceptance + messy-data + multi-seed tests
build_dashboard.py    bakes results into out/dashboard.html
dashboard_template.html
run.py                one command for everything
```
