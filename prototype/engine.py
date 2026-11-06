"""
Merchant Reality Engine - hackathon prototype.

Question it answers for every merchant:
    "Does what this merchant actually does still match what it said it is?"

Pipeline (one function per layer):
    L1 ingest()      load feeds + build a coverage map (what we can actually see)
    L2 profile()     anchor profile (Jul-Aug) + festival-aware expected volume
    L3 detect()      6 evidence families, each returns SUPPORTS_ILLICIT /
                     SUPPORTS_BENIGN / UNKNOWN with the numbers behind it
    L4 fuse()        count independent families, never UNKNOWNs
    L6 respond()     map to the L0-L5 ladder with legal gates
    (L5 review and L7 labels live in the dashboard: analyst confirms/dismisses.)

Three rules the code enforces:
    1. Missing data = UNKNOWN. It never adds to suspicion.
    2. Correlated signals inside one family count once.
    3. Escalation needs 2+ independent families; restrictive action needs 3+
       including one that is hard to fake, AND a human sign-off.

Run:  python engine.py   -> writes ./out/results.json
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict, field
from datetime import date, timedelta

import pandas as pd

HERE = os.path.dirname(__file__)
DATA = os.environ.get("MRE_DATA", os.path.join(HERE, "data"))
OUT = os.environ.get("MRE_OUT", os.path.join(HERE, "out"))

ANCHOR = (date(2025, 7, 1), date(2025, 8, 31))   # approved "known-good" profile period
REVIEW = (date(2025, 10, 2), date(2025, 10, 31))  # the 30 days being judged
PRIOR = (date(2025, 9, 2), date(2025, 10, 1))     # rolling baseline (previous 30 days)

# Seasonal expectation: how much each category normally grows at Diwali peak.
SEASONAL_PEAK = {"bakery": 3.5, "sweets": 4.0, "grocery": 1.8, "apparel": 2.6,
                 "electronics": 2.2, "salon": 1.7, "florist": 2.5, "gifts": 3.0}

# Evidence families. "hard" = backed by processor/bank records the merchant
# can't easily stage; "soft" = patterns a careful operator could shape.
FAMILIES = {
    "A": ("Ticket size vs declared menu", "soft"),
    "B": ("Who is paying (geography & customer base)", "soft"),
    "C": ("When money arrives (match-time timing)", "soft"),
    "D": ("Refund integrity", "hard"),
    "F": ("Settlement & cash-out speed", "hard"),
    "G": ("Checkout provenance", "hard"),
}

ILLICIT, BENIGN, UNKNOWN = "SUPPORTS_ILLICIT", "SUPPORTS_BENIGN", "UNKNOWN"

LADDER = {
    0: ("L0", "Normal monitoring", "No action. Merchant is not contacted."),
    1: ("L1", "Watch", "Silent. Re-check weekly; no impact on the merchant."),
    2: ("L2", "Analyst review + information request",
        "Analyst opens a case; merchant is asked to explain the change (EDD)."),
    3: ("L3", "Proportionate restriction (proposed)",
        "e.g. cap ticket size on new payers, move settlement T+1 to T+2 within contract terms. "
        "Needs analyst sign-off; merchant notified with reason and appeal route."),
    4: ("L4", "Settlement hold", "LOCKED: needs a contract-specific legal opinion and escrow design."),
    5: ("L5", "Terminate + report",
        "Only after analyst confirmation, or on a direction from the Online Gaming Authority / court / LEA. "
        "Suspicious transaction report to FIU-IND."),
}


@dataclass
class Evidence:
    family: str
    signal: str
    state: str
    value: str
    baseline: str
    why: str
    records: int = 0


@dataclass
class Verdict:
    merchant: dict
    coverage: dict
    trigger: dict
    evidence: list = field(default_factory=list)
    level: int = 0
    mechanism: str = ""
    summary: str = ""
    illicit_families: list = field(default_factory=list)
    benign_families: list = field(default_factory=list)
    unknown_families: list = field(default_factory=list)
    series: list = field(default_factory=list)


# ------------------------------------------------------------------ L1 ingest
REQUIRED = {
    "transactions.csv": ["txn_id", "merchant_id", "ts", "amount", "payer_id"],
    "refunds.csv": ["refund_id", "merchant_id", "ts", "amount", "payer_id", "original_txn_id"],
    "settlements.csv": ["merchant_id", "settle_date", "settled_amount", "withdrawn_amount", "hours_to_withdraw"],
    "merchants.csv": ["merchant_id", "name", "category", "state", "ticket_min", "ticket_max"],
}
DATA_ISSUES = []  # every row we had to drop or fix, reported in results.json


class DataError(Exception):
    pass


def _load(name, dates):
    path = os.path.join(DATA, name)
    if not os.path.exists(path):
        if name in ("refunds.csv", "settlements.csv"):  # optional feeds: absence = UNKNOWN, not a crash
            DATA_ISSUES.append(f"{name} missing: every merchant's {name.split('.')[0]} evidence will be UNKNOWN")
            return pd.DataFrame(columns=REQUIRED[name])
        raise DataError(f"Required file not found: {path}. Run `python generate_data.py` first.")
    df = pd.read_csv(path, low_memory=False)
    missing = [c for c in REQUIRED[name] if c not in df.columns]
    if missing:
        raise DataError(f"{name} is missing column(s): {', '.join(missing)}")
    for c in dates:
        bad = pd.to_datetime(df[c], errors="coerce").isna() & df[c].notna()
        df[c] = pd.to_datetime(df[c], errors="coerce")
        if bad.any():
            DATA_ISSUES.append(f"{name}: dropped {int(bad.sum())} row(s) with an unreadable {c}")
    for c in [c for c in REQUIRED[name] if c in ("amount", "settled_amount", "withdrawn_amount",
                                                   "hours_to_withdraw", "ticket_min", "ticket_max")]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    before = len(df)
    df = df.dropna(subset=[c for c in REQUIRED[name] if c != "original_txn_id"])
    if len(df) < before:
        DATA_ISSUES.append(f"{name}: dropped {before - len(df)} row(s) with missing or invalid required values")
    return df


def ingest():
    DATA_ISSUES.clear()
    tx = _load("transactions.csv", ["ts"])
    tx = tx.drop(columns=["kind"], errors="ignore")  # ground truth: the engine is never allowed to see it
    neg = tx.amount <= 0
    if neg.any():
        DATA_ISSUES.append(f"transactions.csv: dropped {int(neg.sum())} zero/negative amount row(s)")
        tx = tx[~neg]
    dup = tx.txn_id.duplicated()
    if dup.any():
        DATA_ISSUES.append(f"transactions.csv: dropped {int(dup.sum())} duplicate txn_id row(s)")
        tx = tx[~dup]
    for c in ("payer_state", "referrer"):
        if c not in tx.columns:
            tx[c] = None
    rf = _load("refunds.csv", ["ts"])
    st = _load("settlements.csv", ["settle_date"])
    mc = _load("merchants.csv", [])
    if mc.merchant_id.duplicated().any():
        raise DataError("merchants.csv has duplicate merchant_id values")
    if "declared_site" not in mc.columns:
        mc["declared_site"] = None
    if "mcc" not in mc.columns:
        mc["mcc"] = None
    if "city" not in mc.columns:
        mc["city"] = ""
    # A feed counts as available only if the flag says so AND we actually received rows for it.
    for flag, ok in [("feed_refunds", len(rf) > 0), ("feed_settlements", len(st) > 0),
                     ("feed_payer_state", tx.payer_state.notna().any()),
                     ("feed_referrer", tx.referrer.notna().any())]:
        col = mc[flag] if flag in mc.columns else True
        mc[flag] = pd.Series(col, index=mc.index).astype(str).str.lower().isin(["true", "1", "yes"]) & ok
    unknown = set(tx.merchant_id) - set(mc.merchant_id)
    if unknown:
        DATA_ISSUES.append(f"transactions.csv: {len(unknown)} merchant_id(s) not in merchants.csv were ignored")
    cal_path = os.path.join(DATA, "calendar.json")
    if os.path.exists(cal_path):
        with open(cal_path) as f:
            cal = json.load(f)
    else:
        DATA_ISSUES.append("calendar.json missing: match-time check is UNKNOWN for everyone")
        cal = dict(diwali="2025-10-20", festival_start="2025-10-08", festival_end="2025-10-22",
                   match_days=[], match_hours=[19.5, 23.5])
    tx["day"] = tx.ts.dt.date
    tx["hour"] = tx.ts.dt.hour + tx.ts.dt.minute / 60
    return tx, rf, st, mc, cal


def between(s, window):
    return (s >= window[0]) & (s <= window[1])


# ------------------------------------------------------------------ L2 profile
def festival_multiplier(category, day, cal):
    fs, fe, dw = (date.fromisoformat(cal[k]) for k in ("festival_start", "festival_end", "diwali"))
    peak = SEASONAL_PEAK.get(category, 1.25)
    if not (fs <= day <= fe):
        return 1.0
    dist = abs((day - dw).days)
    span = (dw - fs).days if day <= dw else (fe - dw).days
    return 1.0 + (peak - 1.0) * max(0.25, 1 - dist / (span + 1))


PEER_GROUPS = {  # merchants whose demand moves together through the year
    "festive food & gifts": {"bakery", "sweets", "gifts", "florist"},
    "retail": {"grocery", "apparel", "electronics", "hardware", "stationery", "pharmacy"},
    "services & dining": {"restaurant", "salon", "fitness", "tailoring", "education"},
}
DAYS = pd.date_range(ANCHOR[0], REVIEW[1]).date


def group_of(category):
    return next((g for g, cats in PEER_GROUPS.items() if category in cats), None)


def peer_indices(tx, mc):
    """For every merchant: daily value / its own anchor average.
    A peer index of 3.0 on a day means similar shops did 3x their normal business."""
    idx = {}
    for _, m in mc.iterrows():
        v = tx[tx.merchant_id == m.merchant_id].groupby("day").amount.sum().reindex(DAYS, fill_value=0)
        idx[m.merchant_id] = v / max(v[between(pd.Series(v.index), ANCHOR).values].mean(), 1)
    return pd.DataFrame(idx)


def profile(m, t, cal, peers, mc):
    """Anchor = approved Jul-Aug behaviour.
    Expected volume E_t = anchor x (median movement of peer merchants that day).
    Median over peers (excluding this merchant) so one bad actor can't move the baseline.
    Falls back to the festival calendar when there are fewer than 3 peers."""
    anchor = t[between(t.day, ANCHOR)]
    base = anchor.groupby("day").amount.sum().mean()
    base = 0.0 if pd.isna(base) else float(base)
    actual = t.groupby("day").amount.sum().reindex(DAYS, fill_value=0)
    g = group_of(m.category)
    ids = [x for x in mc[mc.category.map(group_of) == g].merchant_id if x != m.merchant_id]
    if len(ids) >= 3:
        pidx = peers[ids].median(axis=1).rolling(7, center=True, min_periods=1).mean().fillna(1.0)
        expected = base * pidx
        source = f"median of {len(ids)} '{g}' peers"
    else:
        expected = pd.Series([base * festival_multiplier(m.category, d, cal) for d in DAYS], index=DAYS)
        source = "festival calendar"
    return anchor, actual, expected, source


def residual_trigger(m, actual, expected):
    """Is volume explained by the merchant's normal pattern + the calendar?"""
    rec = between(pd.Series(actual.index), REVIEW).values
    r = actual[rec].sum() / max(expected[rec].sum(), 1) - 1
    # peer-adjusted series, smoothed in 14-day blocks, to find abrupt steps
    adj = (actual.rolling(14).sum() / expected.rolling(14).sum().replace(0, float("nan"))).dropna()
    blocks = adj.iloc[::14]
    steps = (blocks / blocks.shift(1)).dropna()
    max_step = float(steps.max()) if len(steps) else 1.0
    step_at = str(steps.idxmax()) if len(steps) else ""
    raw_growth = actual[rec].mean() / max(actual[between(pd.Series(actual.index), ANCHOR).values].mean(), 1) - 1

    if r > 0.3 and max_step >= 1.6:
        state, why = "UNEXPLAINED", (f"Volume is {r:+.0%} above what similar shops would predict, and it jumped "
                                     f"{max_step:.1f}x in two weeks around {step_at}. Opens a look, proves nothing.")
    elif r > 0.3:
        state, why = "ORGANIC_GROWTH", (f"Volume is {r:+.0%} above what similar shops would predict, but it rose gradually "
                                        f"(largest two-week step {max_step:.2f}x). Looks like a business growing.")
    elif raw_growth > 0.5:
        state, why = "EXPLAINED", (f"Sales are up {raw_growth:+.0%} on July–August, and similar shops rose "
                                   f"the same way over Diwali (actual vs expected {r:+.0%}).")
    else:
        state, why = "IN_LINE", f"Volume within normal range (actual vs expected {r:+.0%})."
    return dict(state=state, residual=round(r, 3), max_step=round(max_step, 2),
                raw_growth=round(raw_growth, 3), why=why)


# ------------------------------------------------------------------ L3 detect
def fam_A(m, anchor, recent):
    off = lambda d: ((d.amount > m.ticket_max) | (d.amount < m.ticket_min)).mean()
    lump = lambda d: ((d.amount >= 500) & (d.amount % 500 == 0)).mean()
    off_r, lump_r, lump_a = off(recent), lump(recent), lump(anchor)
    vals = f"{off_r:.0%} above/below menu; {lump_r:.0%} round ₹500-multiples"
    base = f"{off(anchor):.0%} off-menu; {lump_a:.0%} round lumps"
    n = int(((recent.amount > m.ticket_max) | ((recent.amount >= 500) & (recent.amount % 500 == 0))).sum())
    if off_r > 0.05 or (lump_r - lump_a) > 0.12:
        return Evidence("A", "Off-menu & round-lump payments", ILLICIT, vals, base,
                        f"Payments don't look like a {m.category}'s price list (declared ₹{m.ticket_min}–₹{m.ticket_max}).", n)
    return Evidence("A", "Off-menu & round-lump payments", BENIGN, vals, base,
                    "Ticket sizes fit the declared menu, including any festive gift boxes.", 0)


def fam_B(m, anchor, recent):
    if not m.feed_payer_state:
        return Evidence("B", "Payer geography & customer base", UNKNOWN, "no payer-location feed", "–",
                        "We can't see where payers are. Not counted for or against the merchant.")
    out = lambda d: (d.payer_state != m.state).mean()
    seen = set(anchor.payer_id)
    new_share = (~recent.payer_id.isin(seen)).mean()
    o_r, o_a = out(recent), out(anchor)
    vals = f"{o_r:.0%} out-of-state payers; {new_share:.0%} of payments from never-seen payers"
    base = f"{o_a:.0%} out-of-state"
    n = int((recent.payer_state != m.state).sum())
    if o_r > 0.30 and (o_r - o_a) > 0.20:
        return Evidence("B", "Payer geography & customer base", ILLICIT, vals, base,
                        f"A {m.category} in {m.city} is suddenly paid mostly by people in other states.", n)
    return Evidence("B", "Payer geography & customer base", BENIGN, vals, base,
                    "Customers are still mostly local.", 0)


def fam_C(m, recent, cal):
    md = {date.fromisoformat(d) for d in cal.get("match_days", [])}
    if not any(REVIEW[0] <= d <= REVIEW[1] for d in md):
        return Evidence("C", "Match-time timing", UNKNOWN, "no match calendar for this period", "–",
                        "We can't line payments up with matches. Not counted for or against the merchant.")
    h0, h1 = cal["match_hours"]
    win = recent[(recent.hour >= h0) & (recent.hour <= h1)]
    on = win[win.day.isin(md)].groupby("day").amount.sum()
    off = win[~win.day.isin(md)].groupby("day").amount.sum()
    n_on = sum(1 for d in md if REVIEW[0] <= d <= REVIEW[1])
    n_off = 30 - n_on
    per_on, per_off = on.sum() / max(n_on, 1), off.sum() / max(n_off, 1)
    ratio = per_on / max(per_off, 1)
    share = on.sum() / max(recent.amount.sum(), 1)
    vals = f"match evenings bring {ratio:.1f}x the money of other evenings ({share:.0%} of all value)"
    if ratio > 2.0 and share > 0.15:
        return Evidence("C", "Match-time timing", ILLICIT, vals, "≈1.0x for a normal shop",
                        "Money arrives when cricket matches are on, not when people buy bread.",
                        int(len(win[win.day.isin(md)])))
    return Evidence("C", "Match-time timing", BENIGN, vals, "≈1.0x",
                    "Evening sales are the same on match and non-match days.", 0)


def fam_D(m, recent_tx, all_tx, rf):
    if not m.feed_refunds:
        return Evidence("D", "Refund integrity", UNKNOWN, "no refund feed", "–",
                        "We can't see refunds. Not counted for or against the merchant.")
    r = rf[(rf.merchant_id == m.merchant_id) & between(rf.ts.dt.date, REVIEW)]
    if len(r) == 0:
        return Evidence("D", "Refund integrity", BENIGN, "no refunds in window", "–", "Nothing unusual.", 0)
    orig = all_tx.set_index("txn_id")
    def matched(row):
        if pd.isna(row.original_txn_id) or row.original_txn_id not in orig.index:
            return False
        o = orig.loc[row.original_txn_id]
        return o.payer_id == row.payer_id and row.amount <= o.amount
    ok = r.apply(matched, axis=1)
    bad_val = r.amount[~ok].sum() / r.amount.sum()
    ratio = r.amount.sum() / max(recent_tx.amount.sum(), 1)
    vals = f"{(~ok).sum()} of {len(r)} refunds have no matching payment ({bad_val:.0%} of refund value); refunds = {ratio:.1%} of sales"
    if (~ok).sum() >= 5 and bad_val > 0.2:
        return Evidence("D", "Refund integrity", ILLICIT, vals, "refunds normally trace to an earlier payment",
                        "Money is going out as 'refunds' that are bigger than the payment or go to people who never paid. "
                        "Consistent with winnings being paid out.", int((~ok).sum()))
    return Evidence("D", "Refund integrity", BENIGN, vals, "all refunds traceable",
                    "Every refund traces back to a real earlier payment.", 0)


def fam_F(m, st):
    if not m.feed_settlements:
        return Evidence("F", "Settlement & cash-out speed", UNKNOWN, "no settlement feed", "–",
                        "We can't see settlements. Not counted for or against the merchant.")
    s = st[st.merchant_id == m.merchant_id]
    fast = lambda d: d.withdrawn_amount[d.hours_to_withdraw <= 6].sum() / max(d.settled_amount.sum(), 1)
    rec, anc = s[between(s.settle_date.dt.date, REVIEW)], s[between(s.settle_date.dt.date, ANCHOR)]
    f_r, f_a = fast(rec), fast(anc)
    vals = f"{f_r:.0%} of settled money withdrawn within 6 hours"
    base = f"{f_a:.0%} in Jul–Aug"
    if f_r > 0.5 and (f_r - f_a) > 0.4:
        return Evidence("F", "Settlement & cash-out speed", ILLICIT, vals, base,
                        "The account is emptied within hours of every settlement. Shops keep a working balance; "
                        "pass-through accounts don't.", int((rec.hours_to_withdraw <= 6).sum()))
    return Evidence("F", "Settlement & cash-out speed", BENIGN, vals, base,
                    "Cash-out pattern unchanged from the approved profile.", 0)


def fam_G(m, recent):
    if not m.feed_referrer:
        return Evidence("G", "Checkout provenance", UNKNOWN, "no checkout-source feed", "–",
                        "We can't see where checkouts start. Not counted for or against the merchant.")
    allowed = {"qr", "pos"} | ({m.declared_site} if isinstance(m.declared_site, str) else set())
    foreign = ~recent.referrer.isin(allowed)
    top = recent.referrer[foreign].value_counts().head(2)
    vals = f"{foreign.mean():.0%} of payments start on sites the merchant never declared" + (
        f" (top: {', '.join(top.index)})" if len(top) else "")
    if foreign.mean() > 0.10:
        return Evidence("G", "Checkout provenance", ILLICIT, vals, "0% expected",
                        "Customers reach this merchant's checkout from unrelated websites.", int(foreign.sum()))
    return Evidence("G", "Checkout provenance", BENIGN, vals, "0%",
                    "Payments come from the shop's own QR, card machine or website.", 0)


# ------------------------------------------------------------------ L4 fuse + L6 respond
def fuse_and_respond(v: Verdict):
    ill = [e.family for e in v.evidence if e.state == ILLICIT]
    v.illicit_families = ill
    v.benign_families = [e.family for e in v.evidence if e.state == BENIGN]
    v.unknown_families = [e.family for e in v.evidence if e.state == UNKNOWN]
    hard = [f for f in ill if FAMILIES[f][1] == "hard"]

    if len(ill) >= 3 and hard:
        v.level = 3
    elif len(ill) == 2:
        v.level = 2
    elif len(ill) == 1 or v.trigger["state"] == "UNEXPLAINED":
        v.level = 1
    else:
        v.level = 0

    s = set(ill)
    if "C" in s and ({"D", "F"} & s):
        v.mechanism = "Disguised gambling collection: deposits in at match time, winnings out as 'refunds', account swept daily"
    elif {"G", "A"} <= s:
        v.mechanism = "Transaction laundering: another business's payments routed through this merchant's checkout"
    elif ill:
        v.mechanism = "No coherent mechanism yet: a single change, most likely a legitimate business change"
    else:
        v.mechanism = "None"

    name = v.merchant["name"]
    if v.level == 0:
        gap = f" {len(v.unknown_families)} data gap(s) noted, not held against them." if v.unknown_families else ""
        v.summary = f"{name}'s activity still matches its declared business. {v.trigger['why']}{gap}"
    elif v.level == 1:
        v.summary = (f"One thing changed at {name} ({', '.join(FAMILIES[f][0] for f in ill) or 'volume only'}), "
                     "but nothing else backs it up. Watch silently; one signal is never enough to act.")
    else:
        v.summary = (f"{len(ill)} independent kinds of evidence at {name} point the same way "
                     f"({', '.join(FAMILIES[f][0] for f in ill)}). {v.mechanism}.")
    return v


def run():
    tx, rf, st, mc, cal = ingest()
    peers = peer_indices(tx, mc)
    out = []
    for _, m in mc.iterrows():
        try:
            out.append(judge(m, tx, rf, st, mc, cal, peers))
        except Exception as e:  # one broken merchant must never take down the whole run
            v = Verdict(merchant=dict(merchant_id=m.merchant_id, name=m["name"], category=m.category),
                        coverage={}, trigger=dict(state="ERROR", why=str(e)))
            v.level, v.mechanism = 1, "None"
            v.summary = f"Engine could not assess this merchant ({type(e).__name__}). Sent to manual check, no action taken."
            out.append(v)
    return _write(out, cal)


MIN_HISTORY_DAYS = 30   # days of activity in the anchor period before "change" checks are meaningful


def judge(m, tx, rf, st, mc, cal, peers):
    t = tx[tx.merchant_id == m.merchant_id]
    anchor, actual, expected, source = profile(m, t, cal, peers, mc)
    recent = t[between(t.day, REVIEW)]
    history_days = anchor.day.nunique()
    if recent.empty:
        trig = dict(state="INACTIVE", residual=0, max_step=1, raw_growth=0,
                    why="No payments in the review window. Nothing to judge.")
    elif history_days < MIN_HISTORY_DAYS:
        trig = dict(state="NEW_MERCHANT", residual=0, max_step=1, raw_growth=0,
                    why=f"Only {history_days} day(s) of approved history. Change checks wait until there's "
                        f"{MIN_HISTORY_DAYS}; point-in-time checks still run.")
    else:
        trig = residual_trigger(m, actual, expected)
    trig["baseline_source"] = source
    v = Verdict(
        merchant={k: (None if pd.isna(m[k]) else (m[k].item() if hasattr(m[k], "item") else m[k]))
                  for k in ["merchant_id", "name", "category", "mcc", "city", "state",
                            "ticket_min", "ticket_max", "declared_site"]},
        coverage={k.replace("feed_", ""): bool(m[k]) for k in m.index if k.startswith("feed_")},
        trigger=trig,
    )
    no_hist = lambda f, sig: Evidence(f, sig, UNKNOWN, "not enough history", "–",
                                      "Needs an approved baseline to compare against. Not counted either way.")
    if recent.empty:
        v.evidence = [Evidence(f, n, UNKNOWN, "no recent payments", "–", "Nothing to assess.")
                      for f, (n, _) in FAMILIES.items()]
    else:
        short = history_days < MIN_HISTORY_DAYS
        v.evidence = [
            no_hist("A", "Off-menu & round-lump payments") if short else fam_A(m, anchor, recent),
            no_hist("B", "Payer geography & customer base") if short else fam_B(m, anchor, recent),
            fam_C(m, recent, cal),
            fam_D(m, recent, t, rf),
            no_hist("F", "Settlement & cash-out speed") if short else fam_F(m, st),
            fam_G(m, recent)]
    fuse_and_respond(v)
    v.series = [dict(d=str(d), a=round(float(actual[d])), e=round(float(expected[d])))
                for d in actual.index]
    return v


def _write(out, cal):
    os.makedirs(OUT, exist_ok=True)
    payload = dict(
        generated="synthetic data · Jul–Oct 2025 · Diwali 20 Oct 2025 (real) · match calendar synthetic",
        windows=dict(anchor=[str(x) for x in ANCHOR], review=[str(x) for x in REVIEW]),
        families={k: dict(name=n, kind=h) for k, (n, h) in FAMILIES.items()},
        ladder={k: dict(code=c, name=n, detail=d) for k, (c, n, d) in LADDER.items()},
        match_days=cal["match_days"], festival=[cal["festival_start"], cal["festival_end"]], diwali=cal["diwali"],
        data_issues=list(DATA_ISSUES),
        merchants=[asdict(v) for v in out],
    )
    with open(os.path.join(OUT, "results.json"), "w") as f:
        json.dump(payload, f, ensure_ascii=False, default=str)
    return out


if __name__ == "__main__":
    import sys
    try:
        results = run()
    except DataError as e:
        sys.exit(f"DATA ERROR: {e}")
    for msg in DATA_ISSUES:
        print("note:", msg)
    for v in results:
        print(f"{v.merchant['merchant_id']} L{v.level} {v.merchant['name'][:28]:28} "
              f"trig={v.trigger['state']:14} r={v.trigger.get('residual', 0):+.2f} step={v.trigger.get('max_step', 1):.2f} "
              f"ill={''.join(v.illicit_families) or '-':6} unk={''.join(v.unknown_families) or '-'}")
