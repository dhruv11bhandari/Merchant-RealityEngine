#!/bin/sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm are required. Install Node.js 20 or later, then run this script again." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20 or later is required (found $(node --version))." >&2
  exit 1
fi

# Install a clean, lockfile-pinned dependency tree when dependencies are absent,
# incomplete, or the lockfile changed since the last installation.
if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ] || ! npm ls --depth=0 >/dev/null 2>&1; then
  echo "Installing project dependencies from package-lock.json..."
  npm ci
fi

exec npm run dev -- --host 127.0.0.1
