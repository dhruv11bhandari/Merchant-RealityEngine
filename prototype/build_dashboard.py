"""Bake ./out/results.json into a single, offline-friendly HTML file: ./out/dashboard.html"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("MRE_OUT", os.path.join(HERE, "out"))


def build():
    src = os.path.join(OUT, "results.json")
    if not os.path.exists(src):
        raise SystemExit("results.json not found. Run `python engine.py` first (or just `python run.py`).")
    with open(src) as f:
        data = json.load(f)
    with open(os.path.join(HERE, "dashboard_template.html")) as f:
        html = f.read()
    # </script> inside the JSON would end the script tag early, so escape "</"
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = html.replace("/*__DATA__*/null", blob)
    dst = os.path.join(OUT, "dashboard.html")
    with open(dst, "w") as f:
        f.write(html)
    return dst


if __name__ == "__main__":
    print("wrote", build())
