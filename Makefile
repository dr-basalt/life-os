.PHONY: up down restart logs ps build dev-up setup

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
