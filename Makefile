.PHONY: up down build logs logs-api logs-db restart deploy dev db-up db-migrate db-studio

# ── Desarrollo local ─────────────────────────────────────────────────
# Requiere: .env configurado y make db-up corriendo
dev:
	@[ -f .env ] || (echo "❌ Falta .env — copia .env.example y ajusta los valores" && exit 1)
	@trap 'kill 0' SIGINT; \
	(cd frontend && npm run dev) & \
	(cd backend && set -a && . ../.env && set +a && npm run dev) & \
	wait

# Levanta solo la BD (para desarrollo local)
db-up:
	docker compose up db -d

# Migraciones Prisma (desarrollo)
db-migrate:
	cd backend && set -a && . ../.env && set +a && npx prisma migrate dev

# Prisma Studio
db-studio:
	cd backend && npx prisma studio

# ── Producción (Docker Compose) ──────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache
	docker compose up -d

logs:
	docker compose logs -f nginx api

logs-api:
	docker compose logs -f api

logs-db:
	docker compose logs -f db

restart:
	docker compose restart api nginx

deploy:
	git pull
	docker compose build --no-cache
	docker compose up -d
	@echo "✅ Desplegado"
