#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# SternOS Brain — Deploy Script (stern-os-brain 46.224.111.203)
# Usage: GH_TOKEN=xxx ANTHROPIC_API_KEY=xxx bash scripts/deploy-brain.sh
# ═══════════════════════════════════════════════════════════════════════════
set -e

SERVER="46.224.111.203"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/evo-k8s}"
REPO="dr-basalt/stern-os"
GH_TOKEN="${GH_TOKEN:?GH_TOKEN required}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY required}"

echo "▶ [1/4] Updating git remote..."
cd "$(dirname "$0")/.."
git remote set-url origin "https://$GH_TOKEN@github.com/$REPO.git"

echo "▶ [2/4] Deploying on stern-os-brain ($SERVER)..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" root@$SERVER bash -s -- "$GH_TOKEN" "$ANTHROPIC_API_KEY" <<'REMOTE_EOF'
GH_TOKEN="$1"
ANTHROPIC_API_KEY="$2"
set -e

apt-get install -yq git curl 2>/dev/null | tail -1

if [ -d /opt/stern-os ]; then
  cd /opt/stern-os && git pull --rebase 2>&1 | tail -3
else
  git clone "https://$GH_TOKEN@github.com/dr-basalt/stern-os.git" /opt/stern-os 2>&1 | tail -3
  cd /opt/stern-os
fi

cd /opt/stern-os

cat > .env <<ENV_EOF
DOMAIN=46.224.111.203.nip.io
PB_ADMIN_EMAIL=admin@ori3com.cloud
PB_ADMIN_PASSWORD=SternOS2026!
ACME_EMAIL=contact@ori3com.cloud
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
NEO4J_HOST=172.19.0.2
NEO4J_PASSWORD=SternOS2026xNeo4j
WM_DB_PASS=WindmillStern2026
S3_ENDPOINT=
S3_BUCKET=
S3_REGION=
S3_KEY=
S3_SECRET=
ENV_EOF

echo ".env written"
REMOTE_EOF

echo "▶ [3/4] Seeding Neo4j..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" root@$SERVER bash <<'REMOTE_EOF'
docker cp /opt/stern-os/scripts/seed-neo4j.cypher neo4j-tws00gckko40084g8k88g0k8:/seed.cypher
docker exec neo4j-tws00gckko40084g8k88g0k8 cypher-shell -u neo4j -p SternOS2026xNeo4j --file /seed.cypher 2>&1 | tail -10
echo "Neo4j seeded ✓"
REMOTE_EOF

echo "▶ [4/4] Starting SternOS stack..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" root@$SERVER bash <<'REMOTE_EOF'
cd /opt/stern-os
docker compose up -d --build 2>&1 | tail -20
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "sternos|neo4j|windmill"
REMOTE_EOF

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ SternOS deployed"
echo "  App:      https://app.46.224.111.203.nip.io"
echo "  API:      https://api.46.224.111.203.nip.io/_/"
echo "  MCP:      https://mcp.46.224.111.203.nip.io"
echo "  Windmill: http://46.224.111.203:8080"
echo "  Neo4j:    http://46.224.111.203:7474"
echo "  Admin:    admin@ori3com.cloud / SternOS2026!"
echo "════════════════════════════════════════════════════════"
