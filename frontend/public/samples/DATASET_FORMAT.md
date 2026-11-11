# MRE dataset format (`mre-dataset/v1`)

One JSON file per merchant under review. Upload it on **Analyze your data** (`/ai-engine/analyze`).
It is converted into the same scenario the built-in cases use and runs through all seven
layers. Everything is processed in the browser.

Only `merchant`, `weeklySales` and `transactions` are required. Every other section is
optional. A missing section is shown as **UNKNOWN**, never as clean.

## Top level

| Field | Required | What it is |
|---|---|---|
| `format` | yes | Always `"mre-dataset/v1"` |
| `title`, `description` | no | Shown in the results |
| `merchant` | yes | The declared business profile (KYC) |
| `weeklySales` | yes | Weekly collection history for baselines and CUSUM (8–16 weeks recommended) |
| `transactions` | yes | Payment ledger: sales, refunds, settlements, payouts |
| `peers` | no | Similar merchants in the file (same category or a related account) |
| `matchFixtures` | no | Match or event start times, for pre-match funding checks |
| `dataAvailability` | no | Which feeds exist: `AVAILABLE`, `PARTIAL` or `MISSING` |
| `website` | no | Crawler results: where payment links are embedded, and the catalogue |
| `orders` | no | Order and fulfilment records |
| `bankCredits` | no | Bank-side credits, to reconcile settlements |
| `purchaserVerification` | no | `{ "contacted": 12, "confirmed": 3 }` |
| `businessFootprint` | no | `{ "supplierPaymentsMonthly": 52000, "gstTurnoverMonthly": 310000 }` |
| `externalSightings` | no | Where this merchant's payment IDs were seen advertised |
| `graph` | no | Evidence graph; built automatically if absent |

## `merchant`

```json
{
  "id": "M-0001", "name": "Your Bakery", "city": "City, India",
  "mcc": "5462", "category": "Bakeries",
  "products": ["Breads", "Cakes"],
  "ticketMin": 150, "ticketMax": 1200,
  "hours": [7, 22],
  "catchment": "LOCAL", "localStates": ["KA"],
  "expectedRoundShare": 0.06, "seasonalPeak": 2,
  "baselineWeekly": 180000, "accountAgeDays": 1180,
  "declaredDomains": ["sweetcrumbs.example"],
  "declaredChannels": ["In-store POS", "Local deliveries"],
  "declaredActivity": ["In-store purchases", "Local deliveries"]
}
```
Required: `id, name, city, mcc, category, ticketMin, ticketMax, hours, localStates, baselineWeekly, accountAgeDays`.

## `weeklySales`

```json
[{ "week": "W1", "actual": 181000, "seasonalMultiplier": 1 },
 { "week": "W16", "actual": 540000, "seasonalMultiplier": 2 }]
```
`actual` may be `null` for weeks before the account existed. `seasonalMultiplier` is the
expected seasonal lift (2 = festival weeks are normally twice a normal week).

## `transactions`

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique |
| `merchantId` | yes | `merchant.id`, or a peer's id |
| `type` | yes | `SALE`, `REFUND`, `TRANSFER`, `SETTLEMENT`, `CHARGEBACK` |
| `amount` | yes | Rupees |
| `time` | yes | ISO 8601 with offset, e.g. `2026-10-18T19:42:10+05:30` |
| `channel` | yes | `POS`, `UPI_LINK`, `UPI_COLLECT`, `ONLINE`, `PAYOUT`, `BANK`; legacy `UPI` is read as `UPI_LINK`. Values are case-insensitive and spaces or hyphens are normalized to underscores. |
| `payerId` | for sales | VPA, card token or customer ref; hashed on import |
| `payerState` | for sales | Two-letter state code |
| `paymentLinkId` | no | Payment link or terminal used (e.g. `PL-01`, `TERM-01`) |
| `settledAt` | no | When a sale settled |
| `orderId` | no | Order id; `null` means "checked, no order found" |
| `refundOfTransactionId` | refunds | The original sale |
| `paidTo` | no | Refund or payout destination, if not the payer |
| `beneficiaryAccount` | settlements, payouts | Account that received the money |

## Optional context

```json
"matchFixtures": ["2026-10-18T19:30:00+05:30"],
"dataAvailability": { "acquiring": "AVAILABLE", "website": "AVAILABLE", "orders": "MISSING", "bank": "MISSING", "fulfillment": "MISSING", "calendar": "AVAILABLE", "verification": "MISSING" },
"website": {
  "embeds": [{ "id": "EMB-002", "merchantId": "M-0001", "linkId": "PL-01", "host": "merchant-directory.example", "path": "/payments", "category": "business directory", "pageType": "directory page", "firstSeen": "2026-10-09" }],
  "catalogue": [{ "sku": "BR-01", "name": "Sourdough loaf", "price": 220, "inCategory": true, "dupImage": false }]
},
"orders": [{ "orderId": "ORD-9000", "saleId": "TX0042", "status": "DELIVERED", "trackingId": "TRK-1" }],
"bankCredits": [{ "amount": 41250, "beneficiaryAccount": "BEN-001" }],
"externalSightings": [{ "source": "public listing", "place": "directory page", "paymentRef": "PL-01", "seenAt": "2026-10-21", "note": "merchant payment link" }]
```
`website.embeds[].category`: `own`, `gambling`, `resale`, `marketplace`, `unknown`.

## What gets checked

* **Core detectors (21, families A–I)**: ticket shape, payer and geography, timing, refunds and money flow, networks, settlement, web provenance, drift, other abuse. These decide the L4 verdict.
* **Solution patterns (S1–S7)**: category model, peer-cohort drift, payer network, Context Passport, trust ladder, business-reality cross-check, outside-in sightings.
* **New betting patterns (N1–N3)**: loss-chasing sequences, late-night collections, rapid pass-through after settlement.

## Samples

`npm run samples` writes six files to `frontend/public/samples/`: the four built-in cases
plus two new synthetic datasets (Chai Corner Café, Shree Ganesh Sweets). All data is synthetic.
Edit any sample and re-upload it to see how the flags change, e.g. set the betting embed's
`category` to `"own"`, or remove the out-of-state payers.
