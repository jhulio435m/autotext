#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${1:-}"

if [[ -z "$PROFILE" ]]; then
  echo "Usage: scripts/use-profile.sh <local|plane-db|plane-api>"
  exit 1
fi

WEB_SRC="$ROOT_DIR/env/profiles/${PROFILE}.web.env"
API_SRC="$ROOT_DIR/env/profiles/${PROFILE}.api.env"
WEB_DST="$ROOT_DIR/.env"
API_DST="$ROOT_DIR/server/.env"

if [[ ! -f "$WEB_SRC" || ! -f "$API_SRC" ]]; then
  echo "Profile not found: $PROFILE"
  echo "Available:"
  ls "$ROOT_DIR/env/profiles"/*.web.env | sed 's#^.*/##; s#\.web\.env$##' | sort
  exit 1
fi

cp "$WEB_DST" "$WEB_DST.bak" 2>/dev/null || true
cp "$API_DST" "$API_DST.bak" 2>/dev/null || true

cp "$WEB_SRC" "$WEB_DST"
cp "$API_SRC" "$API_DST"

if [[ "$PROFILE" == "plane-db" ]]; then
  # Resolve the current bridge IP for the running plane-db container.
  CONTAINER_IP="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' plane-db 2>/dev/null || true)"
  if [[ -n "$CONTAINER_IP" ]]; then
    sed -i "s/^PLANE_DB_HOST=.*/PLANE_DB_HOST=${CONTAINER_IP}/" "$API_DST"
    sed -i "s/^DB_HOST=.*/DB_HOST=${CONTAINER_IP}/" "$API_DST"
    echo "Detected plane-db container IP: $CONTAINER_IP"
    echo "Updated PLANE_DB_HOST in server/.env"
  else
    echo "Warning: could not resolve container IP for plane-db. Keeping DB_HOST from profile."
  fi
fi

echo "Applied profile: $PROFILE"
echo "Updated: .env and server/.env"
echo "Backups: .env.bak and server/.env.bak (if existed)"
