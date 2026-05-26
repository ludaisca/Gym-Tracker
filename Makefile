.PHONY: up down build logs logs-api logs-db restart deploy dev db-up db-migrate db-studio backup android-build android-dev-build android-open android-run

# IP para live reload: Tailscale si está disponible, si no la IP de la ruta principal.
# Se puede sobreescribir: make android-dev-build DEV_IP=192.168.1.x
_TAILSCALE_IP := $(shell tailscale ip -4 2>/dev/null)
_DEFAULT_IP   := $(shell ip -4 route get 8.8.8.8 2>/dev/null | awk '/src/{print $$7; exit}')
DEV_IP        ?= $(if $(_TAILSCALE_IP),$(_TAILSCALE_IP),$(_DEFAULT_IP))

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
	docker compose logs -f api

logs-api:
	docker compose logs -f api

logs-db:
	docker compose logs -f db

restart:
	docker compose restart api

deploy:
	git pull
	docker compose build --no-cache
	docker compose up -d
	@echo "✅ Desplegado"

# ── Android ──────────────────────────────────────────────────────────
android-build:  ## Build web con --mode android y sincroniza Capacitor (producción)
	cd packages/web && npm run build:android
	cd packages/android && npx cap sync android

android-dev-build: ## Compila APK con live reload — instalar UNA VEZ, luego usar 'make dev'
	@[ "$(DEV_IP)" ] || (echo "❌ No se pudo detectar DEV_IP. Pasar manualmente: make android-dev-build DEV_IP=<ip>" && exit 1)
	@echo "🔄 Live reload apuntará a http://$(DEV_IP):5173"
	cd packages/web && npm run build:docker
	cd packages/android && LIVE_RELOAD_IP=$(DEV_IP) npx cap sync android
	cd packages/android/android && \
	  JAVA_HOME=$(HOME)/java/jdk-21.0.7+6 ANDROID_HOME=$(HOME)/android-sdk \
	  ./gradlew assembleDebug
	$(HOME)/android-sdk/platform-tools/adb install -r \
	  packages/android/android/app/build/outputs/apk/debug/app-debug.apk
	@echo "✅ APK instalada. Ejecutar 'make dev' y abrir la app en el teléfono."

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
