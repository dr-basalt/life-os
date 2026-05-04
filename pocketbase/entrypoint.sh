#!/bin/sh
# Minimal entrypoint — S3 optional, PB always starts
set -e

PB_DATA=/pb/pb_data

mkdir -p "$PB_DATA"
echo "[entrypoint] Starting PocketBase..."

# Enable Litestream only when S3 is fully configured
if [ -n "$S3_BUCKET" ] && [ -n "$LITESTREAM_ACCESS_KEY_ID" ] && [ -n "$LITESTREAM_SECRET_ACCESS_KEY" ]; then
  echo "[entrypoint] S3 configured — starting with Litestream replication"

  # Restore from S3 if no local DB
  if [ ! -f "$PB_DATA/data.db" ]; then
    echo "[entrypoint] No local DB — attempting S3 restore..."
    litestream restore -config /etc/litestream.yml -if-replica-exists "$PB_DATA/data.db" \
      && echo "[entrypoint] Restored from S3" \
      || echo "[entrypoint] No S3 replica — starting fresh"
  fi

  exec litestream replicate -config /etc/litestream.yml \
    -exec "/pb/pocketbase serve --http=0.0.0.0:8090 --dir=$PB_DATA --automigrate"
else
  echo "[entrypoint] No S3 — starting PocketBase directly"
  exec /pb/pocketbase serve --http=0.0.0.0:8090 --dir="$PB_DATA"
fi
