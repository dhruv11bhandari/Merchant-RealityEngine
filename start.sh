#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

usage() {
  cat <<'EOF'
Merchant Reality Engine launcher

Usage:
  ./start.sh             Start the interactive web app at http://localhost:5173
  ./start.sh prototype   Run the Python model checks and open its dashboard
  ./start.sh selftest    Run the TypeScript engine self-test
  ./start.sh samples     Export the sample data files
  ./start.sh --help      Show this help
EOF
}

refresh_real_model() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: Python 3.9 or later is required to run the real model. Install Python and the packages in prototype/requirements.txt." >&2
    exit 1
  fi
  if ! python3 -c 'import sys, numpy, pandas; sys.exit(0 if sys.version_info >= (3, 9) else 1)' >/dev/null 2>&1; then
    echo "Error: Python 3.9+ with pandas and numpy is required. Install dependencies with: python3 -m pip install -r prototype/requirements.txt" >&2
    exit 1
  fi
  echo "Running the Python merchant model on its current datasets..."
  python3 prototype/engine.py
  python3 prototype/build_dashboard.py
  cp prototype/out/dashboard.html frontend/public/real-model.html
}

ensure_node() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "Error: Node.js and npm are required. Install Node.js 20 or later, then try again." >&2
    exit 1
  fi

  NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
  if (( NODE_MAJOR < 20 )); then
    echo "Error: Node.js 20 or later is required (found $(node --version))." >&2
    exit 1
  fi

  if [[ ! -x node_modules/.bin/vite ]]; then
    echo "Dependencies are missing; installing from package-lock.json..."
    npm ci --cache "${TMPDIR:-/tmp}/merchant-reality-engine-npm-cache"
  fi
}

case "${1:-web}" in
  web|--web)
    refresh_real_model
    ensure_node
    echo "Starting Merchant Reality Engine at http://localhost:5173"
    exec npm run dev -- --host 127.0.0.1
    ;;
  prototype)
    python3 prototype/run.py
    cp prototype/out/dashboard.html frontend/public/real-model.html
    DASHBOARD="$PROJECT_DIR/prototype/out/dashboard.html"
    echo "Prototype dashboard generated: $DASHBOARD"
    if command -v open >/dev/null 2>&1; then
      open "$DASHBOARD"
    else
      echo "Open that file in a browser to view the offline dashboard."
    fi
    ;;
  selftest|samples)
    ensure_node
    exec npm run "$1"
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown option: $1" >&2
    usage >&2
    exit 2
    ;;
esac
