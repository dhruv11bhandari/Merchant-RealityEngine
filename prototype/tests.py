"""
Acceptance tests: the behaviour we promise the judges, written as checks.

    python tests.py            # checks the main dataset (seed 42)
    python tests.py --seeds 5  # re-generates 5 different random worlds and checks
                               # the promises hold in every one (not tuned to one seed)
"""
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))


def check(results):
    v = {r.merchant["merchant_id"]: r for r in results}
    fails = []

    def expect(cond, msg):
        (fails if not cond else []).append(msg)

    # 1. Genuine bakery with a Diwali spike is left alone
    expect(v["M001"].level == 0, "M001 genuine Diwali bakery must stay at L0")
    expect(v["M001"].trigger["state"] in ("EXPLAINED", "IN_LINE"), "M001 surge must be explained by calendar")
    # 2. Front bakery is escalated, with hard-to-fake evidence, and a gambling mechanism
    expect(v["M002"].level >= 3, "M002 front must reach L3 (proposed restriction)")
    expect({"D", "F"} & set(v["M002"].illicit_families), "M002 must have hard evidence (refunds / cash-out)")
    expect("gambling" in v["M002"].mechanism.lower(), "M002 mechanism must be gambling collection")
    # 3. Organic growth is not punished
    expect(v["M003"].level == 0, "M003 growing kitchen must stay at L0")
    expect(v["M003"].trigger["state"] == "ORGANIC_GROWTH", "M003 must be read as organic growth")
    # 4. Missing data is UNKNOWN, never adverse
    expect(v["M004"].level == 0, "M004 thin-data merchant must stay at L0")
    expect(len(v["M004"].unknown_families) >= 3, "M004 gaps must be listed as UNKNOWN")
    expect(not v["M004"].illicit_families, "M004 missing feeds must never count as illicit")
    # 5. One signal alone never escalates
    expect(v["M005"].level <= 1, "M005 single-family change must not go above L1 (watch)")
    # 6. No background merchant is escalated; L4 (settlement hold) is never auto-applied
    for mid, r in v.items():
        if mid not in ("M002", "M005"):
            expect(r.level <= 1, f"{mid} background merchant must not be escalated")
        expect(r.level < 4, f"{mid} must never auto-reach L4/L5")
    return fails


def run_once(data_dir=None, out_dir=None, seed=None):
    env = dict(os.environ)
    if data_dir:
        env.update(MRE_DATA=data_dir, MRE_OUT=out_dir, MRE_SEED=str(seed))
        subprocess.run([sys.executable, os.path.join(HERE, "generate_data.py")], env=env,
                       check=True, capture_output=True)
        os.environ.update(MRE_DATA=data_dir, MRE_OUT=out_dir)
    import importlib
    import engine
    importlib.reload(engine)
    return check(engine.run())


def edge_cases():
    """Messy real-world input must never crash the engine or wrongly flag anyone."""
    import importlib
    import shutil
    import pandas as pd
    import engine

    src = os.environ.get("MRE_DATA", os.path.join(HERE, "data"))
    fails = []
    with tempfile.TemporaryDirectory() as d:
        data, out = os.path.join(d, "data"), os.path.join(d, "out")
        shutil.copytree(src, data)
        os.environ.update(MRE_DATA=data, MRE_OUT=out)

        # (a) a merchant with no transactions, a brand-new merchant, an unknown category,
        #     feed flags written as text, and junk rows mixed into transactions
        mc = pd.read_csv(os.path.join(data, "merchants.csv"))
        extra = mc.iloc[[0, 0, 0]].copy()
        extra["merchant_id"] = ["M021", "M022", "M023"]
        extra["name"] = ["Dormant Shop", "Brand New Cafe", "Odd Category Co"]
        extra["category"] = ["bakery", "restaurant", "astrology"]
        mc = pd.concat([mc, extra])
        mc["feed_refunds"] = mc["feed_refunds"].astype(str)          # "True"/"False" strings
        mc.to_csv(os.path.join(data, "merchants.csv"), index=False)
        tx = pd.read_csv(os.path.join(data, "transactions.csv"))
        new = tx[(tx.merchant_id == "M012") & (tx.ts >= "2025-10-10")].head(300).copy()
        new["merchant_id"], new["txn_id"] = "M022", "NEW" + new.txn_id
        odd = tx[tx.merchant_id == "M013"].copy()
        odd["merchant_id"], odd["txn_id"] = "M023", "ODD" + odd.txn_id
        junk = tx.head(4).copy()
        junk["amount"] = pd.Series([-50, 0, "abc", None], index=junk.index, dtype=object)
        junk["ts"] = pd.Series(["not-a-date"] + ["2025-10-05 10:00"] * 3, index=junk.index, dtype=object)
        junk["txn_id"] = "JUNK" + junk.txn_id
        ghost = tx.head(2).copy()
        ghost["merchant_id"], ghost["txn_id"] = "M999", "GHOST" + ghost.txn_id   # not in merchants.csv
        dupes = tx.head(3)                                                     # duplicate txn_ids
        pd.concat([tx, new, odd, junk, ghost, dupes]).to_csv(os.path.join(data, "transactions.csv"), index=False)

        importlib.reload(engine)
        try:
            v = {r.merchant["merchant_id"]: r for r in engine.run()}
        except Exception as e:
            return [f"engine crashed on messy input: {type(e).__name__}: {e}"]
        if any(r.trigger.get("state") == "ERROR" for r in v.values()):
            fails.append("a merchant hit an engine error: " + ", ".join(
                k for k, r in v.items() if r.trigger.get("state") == "ERROR"))
        if v["M021"].trigger["state"] != "INACTIVE" or v["M021"].level != 0:
            fails.append("dormant merchant must be INACTIVE at L0")
        if v["M022"].trigger["state"] != "NEW_MERCHANT" or v["M022"].level > 1:
            fails.append("brand-new merchant must be NEW_MERCHANT and not escalated")
        if v["M023"].level > 1:
            fails.append("unknown category must not cause escalation")
        if v["M002"].level < 3:
            fails.append("messy rows elsewhere must not hide the front (M002)")
        if len(engine.DATA_ISSUES) < 3:
            fails.append("junk/ghost/duplicate rows must be reported in data_issues")

        # (b) settlement feed missing entirely: F becomes UNKNOWN, front still caught
        os.remove(os.path.join(data, "settlements.csv"))
        importlib.reload(engine)
        v = {r.merchant["merchant_id"]: r for r in engine.run()}
        if "F" not in v["M002"].unknown_families:
            fails.append("missing settlement file must make F UNKNOWN")
        if v["M002"].level < 3:
            fails.append("front must still reach L3 without settlement data (D/G are hard evidence)")
        if any(r.level > 1 for k, r in v.items() if k not in ("M002", "M005")):
            fails.append("missing settlement file must not flag genuine merchants")

        # (c) a required column missing: clear error message, not a stack trace
        pd.read_csv(os.path.join(data, "merchants.csv")).drop(columns=["ticket_max"]).to_csv(
            os.path.join(data, "merchants.csv"), index=False)
        importlib.reload(engine)
        try:
            engine.run()
            fails.append("missing required column must raise DataError")
        except engine.DataError as e:
            if "ticket_max" not in str(e):
                fails.append("DataError must name the missing column")
    os.environ.pop("MRE_DATA", None)
    os.environ.pop("MRE_OUT", None)
    return fails


if __name__ == "__main__":
    seeds = int(sys.argv[sys.argv.index("--seeds") + 1]) if "--seeds" in sys.argv else 0
    if not seeds:
        f = run_once()
        print("PASS: scenario tests (seed 42)" if not f else "FAIL:\n  " + "\n  ".join(f))
        e = edge_cases()
        print("PASS: messy-data tests" if not e else "FAIL:\n  " + "\n  ".join(e))
        import engine as _e, importlib as _i
        _i.reload(_e); _e.run()   # leave ./out/results.json from the clean dataset
        sys.exit(1 if (f or e) else 0)
    total = 0
    for s in range(1, seeds + 1):
        with tempfile.TemporaryDirectory() as d:
            f = run_once(os.path.join(d, "data"), os.path.join(d, "out"), 1000 + s)
        total += len(f)
        print(f"seed {1000 + s}: {'PASS' if not f else 'FAIL ' + '; '.join(f)}")
    sys.exit(1 if total else 0)
