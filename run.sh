#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

HOST="${HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"

for bin in npm node; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "ClassLoop needs '$bin' on PATH before it can install or run dependencies." >&2
    exit 1
  fi
done

if [ -f ".env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

ensure_dependencies() {
  local missing=0
  for package_bin in electron tsc vite playwright; do
    if [ ! -x "node_modules/.bin/$package_bin" ]; then
      missing=1
    fi
  done

  if [ ! -d "node_modules" ] || [ "$missing" -eq 1 ]; then
    echo "Installing ClassLoop dependencies..."
    if [ -f "package-lock.json" ]; then
      npm ci
    else
      npm install
    fi
  fi
}

ensure_dependencies

if [ "${1:-}" = "--dev" ]; then
  echo "Starting ClassLoop dev server at http://$HOST:$FRONTEND_PORT"
  ./node_modules/.bin/vite --host "$HOST" --port "$FRONTEND_PORT" --strictPort &
  dev_pid=$!

  cleanup() {
    kill "$dev_pid" >/dev/null 2>&1 || true
  }
  trap cleanup EXIT INT TERM

  for _ in $(seq 1 60); do
    if command -v curl >/dev/null 2>&1 && curl -fsS "http://$HOST:$FRONTEND_PORT" >/dev/null 2>&1; then
      break
    fi
    if ! kill -0 "$dev_pid" >/dev/null 2>&1; then
      wait "$dev_pid"
    fi
    sleep 1
  done

  if [ "$OPEN_BROWSER" != "0" ]; then
    if command -v open >/dev/null 2>&1; then
      open "http://$HOST:$FRONTEND_PORT"
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "http://$HOST:$FRONTEND_PORT" >/dev/null 2>&1 || true
    else
      echo "Open http://$HOST:$FRONTEND_PORT in your browser."
    fi
  else
    echo "ClassLoop dev server is ready at http://$HOST:$FRONTEND_PORT"
  fi

  wait "$dev_pid"
  exit 0
fi

npm start
