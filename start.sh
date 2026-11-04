#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Error: Node.js and npm are required. Install Node.js 20 or later, then try again." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( NODE_MAJOR < 20 )); then
  echo "Error: Node.js 20 or later is required (found $(node --version))." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Dependencies are missing; installing from package-lock.json..."
  npm ci
fi

echo "Starting Merchant Reality Engine at http://localhost:5173"
exec npm run dev -- --host 127.0.0.1
