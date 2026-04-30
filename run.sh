#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d "node_modules/electron" ]; then
  npm install
fi

npm start
