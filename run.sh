#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -f ".env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

if [ ! -d "node_modules/electron" ]; then
  npm install
fi

npm start
