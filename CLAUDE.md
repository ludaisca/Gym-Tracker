# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos esenciales

### Desarrollo local completo
```bash
make dev          # Arranca frontend (Vite :5173) + backend (tsx watch :3001) en paralelo
make db-up        # Solo levanta PostgreSQL + Redis en Docker (necesario para make dev)
make db-migrate   # Ejecuta migraciones Prisma en desarrollo
make db-studio    # Abre Prisma Studio en el navegador
```

### Producción (Docker Compose)
```bash
make up           # Levanta todos los contenedores
make down         # Para todos los contenedores
make build        # Rebuild sin caché + levantar
make logs         # Logs en vivo de nginx y api
make restart      # Reinicia solo api y nginx (sin tocar BD/Redis)
make backup       # Dump manual de PostgreSQL → ./backups/
```

### Android (APK)
```bash
make android-build   # Build del frontend con --mode android y cap sync
make android-open    # Abre el proyecto en Android Studio
make android-run     # Instala en dispositivo USB conectado
```
Para generar la APK final: `cd frontend/android && JAVA_HOME=~/java/jdk-21.0.11+10 ./gradlew assembleDebug`
El APK queda en `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

### Backend
```bash
cd backend && npm run dev      # tsx watch (recarga automática)
cd backend && npm run build    # tsc (solo para verificar tipos)
```

### Frontend
```bash
cd frontend && npm run dev         # Vite dev server con proxy a :3001
cd frontend && npm run build       # tsc -b + vite build (producción web)
cd frontend && npm run build:docker  # Solo vite build (sin tsc, usado en Dockerfile.nginx)
cd frontend && npm run lint        # ESLint
```

## Arquitectura

### Stack
- **Backend**: Fastify v5 + Prisma + PostgreSQL + Redis + BullMQ (colas async)
- **Frontend**: React 19 + Vite 8 + Zustand + Axios + PWA (vite-plugin-pwa)
- **Mobile**: Capacitor 8 (genera APK nativa desde el frontend web)
- **Infra**: Docker Compose con nginx como reverse proxy (Coolify en producción)

### Estructura del backend (`backend/src/`)
- `server.ts` — punto de entrada, importa `app.ts`
- `app.ts` — registra todos los plugins y rutas de Fastify; aquí va CORS, rate-limit, Bull Board
- `plugins/` — `prisma.ts`, `redis.ts`, `auth.ts` (decorators de Fastify)
- `routes/` — un archivo por dominio; cada ruta valida con Zod
- `services/queue.ts` — BullMQ: cola `gym-tracker-bg-jobs` + worker para emails e importaciones
- `services/email.ts` — Nodemailer; sin SMTP configurado imprime los emails en consola (útil para dev)

### Estructura del frontend (`frontend/src/`)
- `api/client.ts` — instancia Axios con `baseURL = VITE_API_URL ?? '/api'`; interceptor de refresh token con singleton para evitar múltiples refreshes simultáneos
- `api/*.ts` — funciones por dominio que llaman al cliente
- `store/index.ts` — tres stores Zustand: `useAuthStore` (auth + user), `useUIStore` (tema, offline), `useOfflineStore` (cola de escrituras pendientes)
- `hooks/useOfflineSync.ts` — al reconectar, replay en serie de la `offlineStore.queue`
- `components/views/` — una vista por pantalla (Dashboard, DayView, Routines, etc.)
- `components/layout/AppShell.tsx` — shell principal con bottom nav

### Flujo de autenticación
JWT de corta duración (access token) + refresh token en `localStorage`. El access token **no se persiste** en Zustand (solo en memoria); al recargar la app se renueva automáticamente usando el refresh token via `/auth/refresh`. El interceptor de Axios usa un singleton `refreshPromise` para serializar múltiples peticiones 401 simultáneas.

### Capacitor / Android
- Config: `frontend/capacitor.config.ts` (`appId: com.ludaisca.gymtracker`)
- Variables de entorno para la APK: `frontend/.env.android` (`VITE_API_URL`)
- El WebView usa origen `capacitor://localhost` → el backend debe tener este origen en la lista CORS de producción (ver `backend/src/app.ts`)
- Java 21 requerido: sistema usa Java 25 (incompatible con Gradle/AGP). Configurado en `frontend/android/gradle.properties` via `org.gradle.java.home`

### Docker / despliegue
- `docker-compose.yml` — configuración base; nginx usa `expose: ["80"]` (sin bind a host)
- `docker-compose.override.yml` — agrega `ports: ["80:80"]` solo para dev local (Docker lo carga automáticamente; Coolify lo ignora)
- `Dockerfile.backend` — multi-stage; el builder usa `npm ci --include=dev` para que `tsc` y `@types/node` estén disponibles aunque Coolify inyecte `NODE_ENV=production` en build time
- `Dockerfile.nginx` — igual `npm ci --include=dev`; usa `npm run build:docker` (sin tsc)
- Coolify enruta el dominio `gym-tracker.ludaisca.ddns.net` a través de su Traefik interno al contenedor nginx

### Variables de entorno
En desarrollo, `.env` está en la raíz del proyecto y el Makefile lo carga con `set -a && . ../.env && set +a`. Las variables críticas son `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` (para las API keys de IA en `UserSettings.aiKey`).
