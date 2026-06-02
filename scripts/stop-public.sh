#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/autotext.public.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "autotext no tiene PID registrado"
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  sleep 1
fi

rm -f "$PID_FILE"
echo "autotext detenido"
