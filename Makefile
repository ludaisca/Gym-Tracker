.PHONY: up down build logs logs-api logs-db restart deploy dev db-up db-migrate db-studio backup android-build android-open android-run

# ── Desarrollo local ─────────────────────────────────────────────────
# Requiere: .env configurado y make db-up corriendo
dev:
	@[ -f .env ] || (echo "❌ Falta .env — copia .env.example y ajusta los valores" && exit 1)
	@trap 'kill 0' SIGINT; \
	(cd packages/web && npm run dev) & \
	(cd packages/backend && set -a && . ../../.env && set +a && \
	 export DATABASE_URL="$$(echo $$DATABASE_URL | sed 's|@db:5432|@localhost:5440|')" && \
	 export REDIS_URL="$$(echo $$REDIS_URL | sed 's|@redis:6379|@localhost:6390|')" && \
	 export PORT=3010 && \
	 npm run dev) & \
	wait

# Levanta solo la BD y caché (para desarrollo local)
db-up:
	docker compose up db redis -d

# Migraciones Prisma (desarrollo)
db-migrate:
	cd packages/backend && set -a && . ../../.env && set +a && \
	 export DATABASE_URL="$$(echo $$DATABASE_URL | sed 's|@db:5432|@localhost:5440|')" && \
	 npx prisma migrate dev

# Prisma Studio
db-studio:
	cd packages/backend && npx prisma studio

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

# ── Android ──────────────────────────────────────────────────────────
android-build:  ## Build web con --mode android y sincroniza Capacitor
	cd packages/web && npm run build:android
	cd packages/android && npx cap sync android

android-open:   ## Abrir proyecto en Android Studio
	cd packages/android && npx cap open android

android-run:    ## Instalar en dispositivo Android conectado por USB
	cd packages/android && npx cap run android

# Backup manual de la base de datos (genera archivo en ./backups/)
backup:
	@mkdir -p backups
	@set -a && . .env && set +a && \
	docker compose exec -T db pg_dump -U $$DB_USER $$DB_NAME | gzip > backups/manual-$$(date +%Y%m%d-%H%M%S).sql.gz && \
	echo "✅ Backup guardado en backups/"
