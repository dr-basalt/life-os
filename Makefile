# ═══════════════════════════════════════════════════════════════════════════════
# SternOS Makefile — Pipeline: IA → IaC → git → pull → deploy sur stern-os-brain
#
# Convention: AUCUNE commande docker ne tourne localement.
# Toutes les ops infra passent par SSH vers stern-os-brain (46.224.111.203).
# Usage: make <target> [SSH_KEY=/path/to/key]
# ═══════════════════════════════════════════════════════════════════════════════

BRAIN      = root@46.224.111.203
SSH_KEY   ?= /tmp/sternos_key
SSH        = ssh -i $(SSH_KEY) -o StrictHostKeyChecking=no $(BRAIN)
REMOTE_DIR = /opt/stern-os

.PHONY: up down restart logs ps build dev-up setup o3c-up o3c-down o3c-build o3c-logs gen-basicauth \
        deploy deploy-all pull-remote rebuild-mcp rebuild-frontend rebuild-pb rebuild-soma \
        seed-gates fix-pb-schema init-qdrant seed-ui-schemas index-okrs sync-vault sync-all \
        status health mcp-tools

# ─── Production ───────────────────────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

build:
	docker compose build --no-cache

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

# ─── Setup ────────────────────────────────────────────────────────────────────
setup:
	@test -f .env || (cp .env.example .env && echo "✓ .env créé — édite-le avant de continuer")
	@echo "✓ Structure prête. Lance: make up"

# ─── Déploiement o3c (cockpit.infra.ori3com.cloud) ────────────────────────────
o3c-setup:
	@test -f .env || (cp .env.o3c .env && echo "✓ .env créé depuis .env.o3c — édite-le avant de continuer")

o3c-build:
	docker compose -f docker-compose.o3c.yml build --no-cache

o3c-up:
	@test -f .env || (echo "✗ Fichier .env manquant — lance: cp .env.o3c .env" && exit 1)
	docker compose -f docker-compose.o3c.yml up -d
	@echo "✓ Life OS démarré"
	@echo "  → https://cockpit.infra.ori3com.cloud"
	@echo "  → https://api-cockpit.infra.ori3com.cloud/_"
	@echo "  → https://pb-cockpit.infra.ori3com.cloud/_/ (admin PB)"

o3c-down:
	docker compose -f docker-compose.o3c.yml down

o3c-logs:
	docker compose -f docker-compose.o3c.yml logs -f --tail=100

# Générer un hash bcrypt pour PB_BASIC_AUTH
gen-basicauth:
	@echo "Usage: htpasswd -nb user password"
	@which htpasswd > /dev/null 2>&1 && htpasswd -nb admin $(or $(PW),changeme) || \
		docker run --rm httpd:alpine htpasswd -nb admin $(or $(PW),changeme)

# ─── Dev local (sans Traefik, ports exposés directement) ─────────────────────
dev-up:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# ─── Backup manuel ────────────────────────────────────────────────────────────
backup:
	docker exec lifeos-pb litestream replicate -once /pb/pb_data/data.db s3://$$S3_BUCKET/pb/data.db
	@echo "✓ Backup S3 forcé"

# ─── Restore depuis S3 ────────────────────────────────────────────────────────
restore:
	docker compose down
	docker run --rm --env-file .env \
		-v life-os_pb_data:/pb/pb_data \
		ghcr.io/benbjohnson/litestream:latest \
		restore -o /pb/pb_data/data.db s3://$$S3_BUCKET/pb/data.db
	@echo "✓ Restore depuis S3 terminé"
	make up

# ─── Mise à jour ──────────────────────────────────────────────────────────────
update:
	git pull
	make build
	make up
	@echo "✓ Mise à jour terminée"

# ═══════════════════════════════════════════════════════════════════════════════
# Pipeline IA → IaC → git → stern-os-brain
# ═══════════════════════════════════════════════════════════════════════════════

# Pull dernière version + restart services modifiés (pipeline standard)
deploy:
	@echo "→ git pull on stern-os-brain..."
	$(SSH) "cd $(REMOTE_DIR) && git pull"

# Pull + rebuild un service spécifique: make rebuild-mcp
rebuild-mcp:
	$(SSH) "cd $(REMOTE_DIR) && git pull && docker compose build mcp --no-cache && docker compose up -d mcp"

rebuild-frontend:
	$(SSH) "cd $(REMOTE_DIR) && git pull && docker compose build frontend --no-cache && docker compose up -d frontend"

rebuild-pb:
	$(SSH) "cd $(REMOTE_DIR) && git pull && docker compose build pocketbase --no-cache && docker compose up -d pocketbase"

rebuild-soma:
	$(SSH) "cd $(REMOTE_DIR) && git pull && docker compose build soma --no-cache && docker compose up -d soma"

# Rebuild tout (après changement docker-compose ou multi-services)
deploy-all:
	$(SSH) "cd $(REMOTE_DIR) && git pull && docker compose build --no-cache && docker compose up -d"

# ─── Data Gates ───────────────────────────────────────────────────────────────

# Seed/upsert toutes les Data Gates (idempotent)
# Exécute scripts/seed-gates.js dans sternos-soma (mount /opt/stern-os complet)
seed-gates:
	@echo "→ Seeding Data Gates on stern-os-brain..."
	$(SSH) "cd $(REMOTE_DIR) && git pull && docker exec sternos-soma node /opt/stern-os/scripts/seed-gates.js"

# Corriger les champs select PocketBase (maxSelect=0)
# Exécute scripts/fix-pb-schema.js dans sternos-soma
fix-pb-schema:
	@echo "→ Fixing PB schema on stern-os-brain..."
	$(SSH) "docker exec sternos-soma node /opt/stern-os/scripts/fix-pb-schema.js"

# Initialiser les collections Qdrant
# Exécute via sternos-soma (mount /opt/stern-os complet, accès réseau interne)
init-qdrant:
	@echo "→ Init Qdrant collections on stern-os-brain..."
	$(SSH) "docker exec sternos-soma node -e \
		\"const Q='http://sternos-qdrant:6333';const V=1536;(async()=>{for(const c of ['insights','okrs','blueprint']){const r=await (await fetch(Q+'/collections/'+c,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({vectors:{size:V,distance:'Cosine'}})})).json();console.log(c,r.status||JSON.stringify(r));}})()\""

# Seed UI Schemas dans PocketBase (4 schémas: dashboard, detail, graph, briefing)
seed-ui-schemas:
	@echo "→ Seeding UI Schemas on stern-os-brain..."
	$(SSH) "cd $(REMOTE_DIR) && git pull && docker exec sternos-soma node /opt/stern-os/scripts/seed-ui-schemas.js"

# Indexer OKRs + KRs dans Qdrant (collection: okrs)
index-okrs:
	@echo "→ Indexing OKRs into Qdrant on stern-os-brain..."
	$(SSH) "docker exec sternos-soma node /opt/stern-os/scripts/index-okrs.js"

# Synchroniser le vault Obsidian → Qdrant insights + Neo4j entities
sync-vault:
	@echo "→ Syncing Obsidian vault to Qdrant + Neo4j on stern-os-brain..."
	$(SSH) "docker exec sternos-soma python3 /opt/stern-os/scripts/sync-obsidian-gate.py"

# Tout synchroniser (OKRs + vault)
sync-all: index-okrs sync-vault

# ─── Observabilité ────────────────────────────────────────────────────────────

# Status des containers sur stern-os-brain
status:
	$(SSH) "docker compose -f $(REMOTE_DIR)/docker-compose.yml ps --format 'table {{.Name}}\t{{.Status}}'"

# Health check de tous les services
health:
	@echo "=== MCP ==="
	@curl -s https://mcp.stern-os.ori3com.cloud/ | python3 -c "import json,sys; d=json.load(sys.stdin); print('v'+d['version'], len(d['tools']), 'tools')" 2>/dev/null || echo "unreachable"
	@echo "=== PocketBase ==="
	@curl -s https://api.stern-os.ori3com.cloud/api/health | python3 -c "import json,sys; print(json.load(sys.stdin))" 2>/dev/null || echo "unreachable"
	@echo "=== Frontend ==="
	@curl -so /dev/null -w "%{http_code}" https://stern-os.ori3com.cloud/

# Liste les tools MCP disponibles
mcp-tools:
	@curl -s https://mcp.stern-os.ori3com.cloud/ | python3 -c "import json,sys; d=json.load(sys.stdin); [print(' -', t['name']) for t in d['tools']]"
