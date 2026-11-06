"""
One command for the whole demo:

    python run.py            # generate data (if missing) -> run engine -> run tests -> build dashboard
    python run.py --fresh    # regenerate the synthetic data first

Then open out/dashboard.html in any browser. No server or internet needed
(fonts fall back to system fonts when offline).
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def step(name, args):
    print(f"\n== {name}")
    r = subprocess.run([sys.executable, *args], cwd=HERE)
    if r.returncode:
        sys.exit(f"\nStopped: '{name}' failed (exit {r.returncode}). Fix the message above and re-run.")


if __name__ == "__main__":
    if sys.version_info < (3, 9):
        sys.exit("Python 3.9 or newer is needed.")
    try:
        import numpy, pandas  # noqa: F401
    except ImportError:
        sys.exit("Missing packages. Run:  pip install -r requirements.txt")
    if "--fresh" in sys.argv or not os.path.exists(os.path.join(HERE, "data", "transactions.csv")):
        step("Generate synthetic data", ["generate_data.py"])
    step("Run engine", ["engine.py"])
    step("Acceptance tests", ["tests.py"])
    step("Build dashboard", ["build_dashboard.py"])
    print("\nDone. Open out/dashboard.html in your browser.")
