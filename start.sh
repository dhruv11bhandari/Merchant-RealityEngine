#!/bin/sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -d node_modules ]; then
  echo "Dependencies are missing. Run 'npm ci' in $PROJECT_DIR first." >&2
  exit 1
fi

exec npm run dev -- --host 127.0.0.1
