.PHONY: up down restart logs ps build dev-up setup o3c-up o3c-down o3c-build o3c-logs gen-basicauth

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
