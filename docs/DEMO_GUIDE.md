# Demo walkthrough

All data is synthetic. Tick **Fast** in the header to shorten processing to about a second.

## 1. Default case: Sweet Crumbs Bakery (5 minutes)

1. Open `/demo`. Read the portfolio indicators, then press **Run investigation** on the Sweet Crumbs card.
2. **L1**: note the event store, the refund linkage meter (8 refunds without a sale), and the coverage map. Orders, bank-side and fulfilment are missing, which is shown as UNKNOWN, not as clean.
3. **L2**: the chart shows actual against three baselines. Against the seasonal expectation the residual is 50%, not 200%.
4. **L3**: open the residual worked example and CUSUM chart. Expand A4 (round-number heaping), B6, C5, D7, D9, G6 and F5 to see what each observed, what it expected and the underlying records. Switch the visual tabs for ticket, timing and geography charts.
5. **L4**: step through the six fusion tabs. Tab 2 shows A1 collapsed into A4 and D7 into D9. Tab 3 lists UNKNOWN items. Tab 5 shows the independence gate. Tab 6 ranks the hypotheses; transaction laundering leads.
6. **Analyst workbench** (`/demo/analyst`): the legitimate chain fails at refund reconciliation and payment-link provenance. Use the tool tabs: verify the payment link, inspect refund reconciliation, domain provenance and coverage gaps. Add a finding and a merchant clarification, then **Record review**.
7. **Response centre**: the suggested level is L3. Execute it: only PL-SCB-07 is disabled; TERM-01 and PL-SCB-01 stay running. Switch to L4: it is blocked until you tick legal authority and escrow. Then a simulated HoldRecord appears with expiry, review time and approver.
8. **Audit and learning**: apply the scripted outcome. See indicators update, detector reliabilities change and the hash-chained audit trail.
9. **Evidence graph**: click nodes and edges, filter edge types, and note the warning that similarity is not identity.

## 2. Legitimate Diwali growth (2 minutes)

Select **Legitimate Diwali growth** and run it. The same 50% seasonal residual and CUSUM alarm appear, but L4 finds only one family on the illicit side and verified, hard-to-fake benign evidence (orders, deliveries, bank reconciliation, purchaser confirmation). No case is opened, the analyst view shows the legitimate chain holding, and the suggested action is a profile refresh (L1).

## 3. Rotation and fabricated substance

- **Merchant rotation**: L3 cohort continuity (E3) and lifecycle handoff (F2). The graph shows both accounts settling to one beneficiary. Rotation leads with a narrow margin over laundering.
- **Fabricated substance**: orders, fulfilment and purchaser verification, plus catalogue inconsistency, give four independent families. The suggested action is Enhanced Due Diligence, and the scripted label is Unresolved.

## Reset and rerun

**Reset** clears results and your inputs. **Re-run** repeats the same deterministic result. `npm run selftest` verifies determinism from the command line.
