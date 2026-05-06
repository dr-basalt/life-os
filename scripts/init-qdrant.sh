#!/bin/bash
# init-qdrant.sh — Create initial Qdrant collections for SternOS
# Usage: bash scripts/init-qdrant.sh [qdrant_url]
# Default: http://localhost:6333 (or use QDRANT_URL env var)

QDRANT="${QDRANT_URL:-${1:-http://localhost:6333}}"
VECTOR_SIZE=1536  # text-embedding-3-small

echo "Qdrant: $QDRANT"

create_collection() {
  local name=$1
  echo -n "  Creating collection '$name'... "
  local res
  res=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$QDRANT/collections/$name" \
    -H "Content-Type: application/json" \
    -d "{\"vectors\": {\"size\": $VECTOR_SIZE, \"distance\": \"Cosine\"}}")
  if [ "$res" = "200" ] || [ "$res" = "201" ]; then
    echo "OK ($res)"
  else
    # Check if already exists
    local check
    check=$(curl -s -o /dev/null -w "%{http_code}" "$QDRANT/collections/$name")
    if [ "$check" = "200" ]; then
      echo "already exists"
    else
      echo "FAILED (HTTP $res)"
    fi
  fi
}

echo "Initializing Qdrant collections..."
create_collection "insights"    # vault notes, journal, veille
create_collection "okrs"        # OKR + KR descriptions
create_collection "blueprint"   # architectural decisions

echo ""
echo "Collections status:"
curl -s "$QDRANT/collections" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for c in data.get('result', {}).get('collections', []):
    print(f\"  - {c['name']}\")
" 2>/dev/null || curl -s "$QDRANT/collections"

echo ""
echo "Done."
