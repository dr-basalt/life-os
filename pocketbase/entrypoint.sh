#!/bin/sh
set -e

PB_DATA=/pb/pb_data
DB_PATH=$PB_DATA/data.db
SCHEMA_VERSION_PATH=$PB_DATA/.schema-version
LS_CONFIG=/etc/litestream.yml

echo "[entrypoint] Starting Life OS PocketBase..."

# ─── S3 disponible ? ──────────────────────────────────────────────────────────
S3_AVAILABLE=false
if [ -n "$S3_BUCKET" ] && [ -n "$LITESTREAM_ACCESS_KEY_ID" ]; then
  S3_AVAILABLE=true
fi

# ─── Restore depuis S3 si DB absente ─────────────────────────────────────────
if [ "$S3_AVAILABLE" = "true" ]; then
  if [ ! -f "$DB_PATH" ]; then
    echo "[entrypoint] DB absente — tentative de restore depuis S3..."
    litestream restore \
      -config "$LS_CONFIG" \
      -if-replica-exists \
      "$DB_PATH" && echo "[entrypoint] ✓ Restore S3 réussi" \
      || echo "[entrypoint] Pas de replica S3 — démarrage fresh"
  else
    # Vérifier si S3 a une version plus récente (auto-feed schema)
    S3_MTIME=$(litestream snapshots -config "$LS_CONFIG" "$DB_PATH" 2>/dev/null \
      | tail -1 | awk '{print $4" "$5}' || echo "0")
    LOCAL_VERSION=$(cat "$SCHEMA_VERSION_PATH" 2>/dev/null || echo "0")
    S3_VERSION=$(litestream snapshots -config "$LS_CONFIG" "$DB_PATH" 2>/dev/null \
      | wc -l | tr -d ' ')

    echo "[entrypoint] DB locale présente (schema-version: $LOCAL_VERSION, snapshots S3: $S3_VERSION)"
  fi
else
  echo "[entrypoint] S3 non configuré — mode local uniquement"
fi

# ─── Créer l'admin initial si besoin ─────────────────────────────────────────
if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  mkdir -p "$PB_DATA"
  # La création d'admin se fait via --automigrate au premier démarrage
  # PocketBase la crée automatiquement si pb_data est vide
fi

# ─── Démarrage ────────────────────────────────────────────────────────────────
if [ "$S3_AVAILABLE" = "true" ]; then
  echo "[entrypoint] Démarrage avec réplication Litestream → S3"
  exec litestream replicate \
    -config "$LS_CONFIG" \
    -exec "/pb/pocketbase serve --http=0.0.0.0:8090 --dir=$PB_DATA --automigrate"
else
  echo "[entrypoint] Démarrage sans réplication S3"
  exec /pb/pocketbase serve \
    --http=0.0.0.0:8090 \
    --dir="$PB_DATA" \
    --automigrate
fi
