#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/autotext.public.pid"
LOG_FILE="$ROOT_DIR/autotext.public.log"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "autotext ya está corriendo con PID $PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$ROOT_DIR"
npm run build >/dev/null

setsid bash -lc "cd '$ROOT_DIR' && exec env API_HOST=0.0.0.0 API_PORT=4010 node server/index.js" \
  >>"$LOG_FILE" 2>&1 < /dev/null &
PID=$!
echo "$PID" >"$PID_FILE"

sleep 2
if kill -0 "$PID" 2>/dev/null; then
  echo "autotext levantado en http://127.0.0.1:4010 con PID $PID"
else
  echo "autotext no pudo iniciar. Revisa $LOG_FILE" >&2
  exit 1
fi
