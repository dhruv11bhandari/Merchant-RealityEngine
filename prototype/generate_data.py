"""
L1 input: synthetic data for the Merchant Reality Engine prototype.

Everything here is SYNTHETIC. Merchant names, payers and domains are invented.
The Diwali 2025 date is real; the cricket match calendar is a synthetic schedule.

Scenarios (the demo story):
  M001  Genuine bakery      - big Diwali spike, local regulars. Must be LEFT ALONE.
  M002  Front bakery        - looks like M001 on paper, but from 5 Sep it collects
                              match-time betting deposits. Must be ESCALATED.
  M003  Growing cloud kitchen - steady organic growth. Must NOT be flagged.
  M004  Kirana, thin data   - several feeds missing. Gaps = UNKNOWN, never guilt.
  M005  Tuition centre      - went online, payers now from other states.
                              One evidence family only -> WATCH, not escalate.
  M006-M020 Background merchants with normal seasonal behaviour.

Run:  python generate_data.py      -> writes CSVs into ./data
"""
from __future__ import annotations

import json
import zlib
import os
from datetime import date, datetime, timedelta

import numpy as np
import pandas as pd

SEED = int(os.environ.get("MRE_SEED", 42))
RNG = np.random.default_rng(SEED)
OUT = os.environ.get("MRE_DATA", os.path.join(os.path.dirname(__file__), "data"))

START = date(2025, 7, 1)
END = date(2025, 10, 31)
DAYS = [START + timedelta(d) for d in range((END - START).days + 1)]
FRONT_SWITCH = date(2025, 9, 5)        # when M002 starts collecting bets
TUITION_ONLINE = date(2025, 9, 1)      # when M005 starts online classes

# ---------------------------------------------------------------- calendar
DIWALI = date(2025, 10, 20)
FESTIVAL_START, FESTIVAL_END = date(2025, 10, 8), date(2025, 10, 22)

# Synthetic cricket schedule: a match roughly every 2-3 days from 1 Aug.
MATCH_DAYS = []
d = date(2025, 8, 1)
while d <= END:
    MATCH_DAYS.append(d)
    d += timedelta(int(RNG.choice([2, 3])))
MATCH_SET = set(MATCH_DAYS)
MATCH_HOURS = (19.5, 23.5)  # evening match window


def festival_multiplier(category: str, day: date) -> float:
    """How much busier a category normally gets in the Diwali season.
    The same table is used by the engine as the seasonal expectation E_t."""
    peak = {
        "bakery": 3.5, "sweets": 4.0, "grocery": 1.8, "apparel": 2.6,
        "electronics": 2.2, "salon": 1.7, "florist": 2.5, "gifts": 3.0,
    }.get(category, 1.25)
    if not (FESTIVAL_START <= day <= FESTIVAL_END):
        return 1.0
    # ramp up to Diwali, short tail after
    dist = abs((day - DIWALI).days)
    span = (DIWALI - FESTIVAL_START).days if day <= DIWALI else (FESTIVAL_END - DIWALI).days
    return 1.0 + (peak - 1.0) * max(0.25, 1 - dist / (span + 1))


# ---------------------------------------------------------------- merchants
STATES = ["MH", "KA", "TN", "DL", "UP", "WB", "GJ", "RJ", "TG", "AP", "KL",
          "MP", "BR", "PB", "HR", "OR", "AS", "JH"]

MERCHANTS = [
    # id, name, category, city, state, ticket_min, ticket_max, site, base_daily_txns, feeds
    ("M001", "Sharma Bakery & Cakes", "bakery", "Pune", "MH", 40, 3000, "sharmabakes.in", 45, "all"),
    ("M002", "Royal Crust Bakery", "bakery", "Pune", "MH", 40, 1500, "royalcrust.in", 32, "all"),
    ("M003", "Tiffin Tales Cloud Kitchen", "restaurant", "Bengaluru", "KA", 90, 900, "tiffintales.in", 20, "all"),
    ("M004", "Lakshmi Kirana Stores", "grocery", "Chennai", "TN", 10, 4000, None, 60, "thin"),
    ("M005", "Bright Minds Tuition", "education", "Jaipur", "RJ", 500, 8000, "brightminds.in", 6, "all"),
    ("M006", "Annapurna Sweets", "sweets", "Lucknow", "UP", 30, 3500, None, 50, "all"),
    ("M007", "Fresh Basket Grocery", "grocery", "Hyderabad", "TG", 20, 5000, "freshbasket.in", 70, "all"),
    ("M008", "MedPlus Corner Chemist", "pharmacy", "Kolkata", "WB", 20, 3000, None, 55, "all"),
    ("M009", "Glow Unisex Salon", "salon", "Ahmedabad", "GJ", 100, 4000, None, 18, "all"),
    ("M010", "Trendz Apparel", "apparel", "Indore", "MP", 250, 6000, "trendz.in", 22, "all"),
    ("M011", "QuickFix Mobile Repair", "electronics", "Delhi", "DL", 150, 6000, None, 15, "all"),
    ("M012", "Spice Route Restaurant", "restaurant", "Kochi", "KL", 150, 3000, "spiceroute.in", 40, "all"),
    ("M013", "Pen & Paper Stationery", "stationery", "Patna", "BR", 10, 1500, None, 30, "all"),
    ("M014", "Bloom Florist", "florist", "Chandigarh", "PB", 100, 3500, "bloomflorist.in", 12, "all"),
    ("M015", "Iron Den Gym", "fitness", "Gurugram", "HR", 500, 6000, None, 5, "all"),
    ("M016", "Stitch Perfect Tailors", "tailoring", "Bhubaneswar", "OR", 200, 5000, None, 9, "all"),
    ("M017", "Brew Corner Cafe", "restaurant", "Mumbai", "MH", 60, 1200, "brewcorner.in", 55, "all"),
    ("M018", "BuildRight Hardware", "hardware", "Surat", "GJ", 50, 15000, None, 20, "all"),
    ("M019", "GiftBox Studio", "gifts", "Nagpur", "MH", 150, 5000, "giftbox.in", 14, "all"),
    ("M020", "Gadget Hub Accessories", "electronics", "Vijayawada", "AP", 100, 5000, "gadgethub.in", 25, "all"),
]

MCC = {"bakery": 5462, "sweets": 5441, "restaurant": 5812, "grocery": 5411, "education": 8299,
       "pharmacy": 5912, "salon": 7230, "apparel": 5651, "electronics": 5732, "stationery": 5943,
       "florist": 5992, "fitness": 7997, "tailoring": 5697, "hardware": 5251, "gifts": 5947}
UPI_HANDLES = ["okaxis", "oksbi", "okhdfcbank", "okicici", "ybl", "paytm", "ibl", "axl"]


def vpa(payer_id: str) -> str:
    """Hashed UPI-style handle, so data looks like PA data without being real."""
    h = zlib.crc32(payer_id.encode()) % 10**8
    return f"u{h:08d}@{UPI_HANDLES[h % len(UPI_HANDLES)]}"


# Typical genuine price points: a few menu items with real-world prices.
def menu_prices(tmin: int, tmax: int, n: int = 25) -> np.ndarray:
    # log-spaced menu, rounded to "shop-like" prices (ends in 0 or 5, some 9s)
    raw = np.exp(RNG.uniform(np.log(tmin), np.log(tmax * 0.6), n))
    ends = RNG.choice([0, 5, 9], n, p=[0.5, 0.3, 0.2])
    return (np.floor(raw / 10) * 10 + ends).clip(tmin, tmax)


def opening_hour(category: str, n: int) -> np.ndarray:
    if category in ("restaurant",):
        return np.concatenate([RNG.normal(13.5, 1.2, n // 2), RNG.normal(20.5, 1.3, n - n // 2)])
    if category in ("bakery", "sweets"):
        return np.concatenate([RNG.normal(9.5, 1.5, n // 2), RNG.normal(18.5, 1.5, n - n // 2)])
    return RNG.normal(14, 3, n)


def build():
    os.makedirs(OUT, exist_ok=True)
    txns, refunds, settlements = [], [], []
    tid = 0
    rid = 0

    for (mid, name, cat, city, state, tmin, tmax, site, base, feeds) in MERCHANTS:
        menu = menu_prices(tmin, tmax)
        # Local regulars: Zipf-ish weights so some customers come back a lot.
        n_regulars = base * 12
        regulars = [f"{mid}-P{i:05d}" for i in range(n_regulars)]
        w = 1 / np.arange(1, n_regulars + 1) ** 0.8
        w /= w.sum()
        new_counter = [0]

        def local_payer(p_new: float) -> str:
            if RNG.random() < p_new:
                new_counter[0] += 1
                return f"{mid}-N{new_counter[0]:05d}"
            return regulars[RNG.choice(n_regulars, p=w)]

        bettors = [f"BET-{mid}-{i:04d}" for i in range(900)]
        bettor_state = {b: RNG.choice(STATES) for b in bettors}
        merchant_txns = []

        for di, day in enumerate(DAYS):
            fm = festival_multiplier(cat, day)
            n = base * fm
            if mid == "M003":                       # organic linear growth ~2.6x
                n = base * (1 + 1.6 * di / len(DAYS)) * fm
            if mid == "M005" and day >= TUITION_ONLINE:
                n = base * 1.8                      # online batch adds students
            n = int(RNG.poisson(max(n, 1)))
            hours = np.clip(opening_hour(cat, n), 6, 23.9)

            for h in hours:
                ts = datetime.combine(day, datetime.min.time()) + timedelta(hours=float(h))
                amt = float(RNG.choice(menu)) * int(RNG.choice([1, 1, 1, 2, 3]))
                # Diwali gift boxes: bigger baskets, still within declared menu range
                if cat in ("bakery", "sweets", "gifts") and fm > 1.3 and RNG.random() < 0.35:
                    amt = float(RNG.choice([650, 850, 1200, 1450, 1800, 2400]))
                amt = min(amt, tmax)
                payer_state = state
                p_new = 0.12 + (0.12 if fm > 1.3 else 0)  # festival brings new gift buyers
                if mid == "M003":
                    p_new = 0.18
                if mid == "M005" and day >= TUITION_ONLINE and RNG.random() < 0.55:
                    payer = local_payer(1.0)
                    payer_state = RNG.choice(STATES)       # online students, all over India
                else:
                    payer = local_payer(p_new)
                    if RNG.random() < 0.04:                # a few genuine out-of-state buyers
                        payer_state = RNG.choice(STATES)
                ref = RNG.choice(["qr", "pos", site or "qr"], p=[0.55, 0.3, 0.15])
                channel = {"qr": "UPI_QR", "pos": RNG.choice(["CARD_POS", "UPI_QR"])}.get(ref, "UPI_INTENT")
                merchant_txns.append(dict(
                    txn_id=f"T{tid:07d}", merchant_id=mid, ts=ts, amount=round(amt, 2),
                    payer_id=payer, payer_state=payer_state, referrer=ref, channel=channel, kind="genuine"))
                tid += 1

            # ---- M002: the betting overlay
            if mid == "M002" and day >= FRONT_SWITCH:
                k = RNG.poisson(34 if day in MATCH_SET else 6)
                for _ in range(k):
                    if day in MATCH_SET:
                        h = RNG.uniform(*MATCH_HOURS)
                    else:
                        h = RNG.uniform(10, 23.5)
                    ts = datetime.combine(day, datetime.min.time()) + timedelta(hours=float(min(h, 23.99)))
                    b = bettors[RNG.integers(len(bettors))]
                    amt = float(RNG.choice([500, 1000, 2000, 5000], p=[0.35, 0.35, 0.2, 0.1]))
                    ref = RNG.choice(["cricwin-pay.example", "fastplay-wallet.example", "qr"], p=[0.6, 0.25, 0.15])
                    channel = "UPI_QR" if ref == "qr" else "UPI_INTENT"
                    merchant_txns.append(dict(
                        txn_id=f"T{tid:07d}", merchant_id=mid, ts=ts, amount=amt,
                        payer_id=b, payer_state=bettor_state[b], referrer=ref, channel=channel, kind="bet"))
                    tid += 1

        mt = pd.DataFrame(merchant_txns)

        # ---- refunds
        genuine = mt[mt.kind == "genuine"]
        idx = RNG.random(len(genuine)) < 0.006
        for _, r in genuine[idx].iterrows():
            refunds.append(dict(refund_id=f"R{rid:06d}", merchant_id=mid,
                                ts=r.ts + timedelta(hours=float(RNG.uniform(2, 72))),
                                amount=r.amount, payer_id=r.payer_id, original_txn_id=r.txn_id))
            rid += 1
        if mid == "M002":
            # "Refunds" that are really winnings paid out: bigger than any payment,
            # or to payers who never paid this merchant.
            bets = mt[mt.kind == "bet"]
            for _, r in bets[RNG.random(len(bets)) < 0.14].iterrows():
                if RNG.random() < 0.5:
                    payer, orig, amt = r.payer_id, None, r.amount * float(RNG.choice([1.8, 2.5, 3.0]))
                else:
                    payer, orig, amt = f"BET-X-{RNG.integers(10**6):06d}", None, float(RNG.choice([1500, 3000, 6000]))
                refunds.append(dict(refund_id=f"R{rid:06d}", merchant_id=mid,
                                    ts=r.ts + timedelta(hours=float(RNG.uniform(1, 6))),
                                    amount=round(amt, 2), payer_id=payer, original_txn_id=orig))
                rid += 1

        # ---- settlements (T+1) and how fast money leaves the account
        daily = mt.groupby(mt.ts.dt.date).amount.sum()
        for day, amt in daily.items():
            sday = day + timedelta(1)
            if mid == "M002" and day >= FRONT_SWITCH:
                hrs, frac = float(RNG.uniform(0.5, 3)), float(RNG.uniform(0.92, 0.99))
            else:
                hrs, frac = float(RNG.uniform(48, 200)), float(RNG.uniform(0.3, 0.8))
            settlements.append(dict(merchant_id=mid, settle_date=sday, settled_amount=round(amt, 2),
                                    withdrawn_amount=round(amt * frac, 2), hours_to_withdraw=round(hrs, 1)))

        txns.append(mt)

    tx = pd.concat(txns, ignore_index=True)
    tx["payer_vpa"] = tx.payer_id.map(vpa)
    tx["rrn"] = [f"{5000_0000_0000 + i * 7919 % 10**11:012d}" for i in range(len(tx))]
    rf = pd.DataFrame(refunds)
    st = pd.DataFrame(settlements)

    # ---- coverage: M004 is a thin-data merchant
    thin = [m[0] for m in MERCHANTS if m[9] == "thin"]
    tx.loc[tx.merchant_id.isin(thin), ["payer_state", "referrer"]] = None
    rf = rf[~rf.merchant_id.isin(thin)]
    st = st[~st.merchant_id.isin(thin)]

    merchants = pd.DataFrame([dict(
        merchant_id=m[0], name=m[1], category=m[2], mcc=MCC[m[2]], city=m[3], state=m[4],
        ticket_min=m[5], ticket_max=m[6], declared_site=m[7],
        feed_refunds=m[9] == "all", feed_settlements=m[9] == "all",
        feed_payer_state=m[9] == "all", feed_referrer=m[9] == "all",
    ) for m in MERCHANTS])

    # The "kind" column is ground truth for testing only; the engine never reads it.
    tx.to_csv(os.path.join(OUT, "transactions.csv"), index=False)
    rf.to_csv(os.path.join(OUT, "refunds.csv"), index=False)
    st.to_csv(os.path.join(OUT, "settlements.csv"), index=False)
    merchants.to_csv(os.path.join(OUT, "merchants.csv"), index=False)
    with open(os.path.join(OUT, "calendar.json"), "w") as f:
        json.dump(dict(diwali=str(DIWALI), festival_start=str(FESTIVAL_START),
                       festival_end=str(FESTIVAL_END),
                       match_days=[str(d) for d in MATCH_DAYS],
                       match_hours=list(MATCH_HOURS)), f, indent=1)
    print(f"transactions={len(tx):,} refunds={len(rf):,} settlements={len(st):,} merchants={len(merchants)}")


if __name__ == "__main__":
    build()
