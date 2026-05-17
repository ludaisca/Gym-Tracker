# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estructura del monorepo

```
v1/
├── packages/
│   ├── backend/    ← API Fastify + Prisma + PostgreSQL + Redis
│   ├── web/        ← React PWA (web app, sin Capacitor)
│   └── android/    ← Wrapper Capacitor + proyecto nativo Android
├── package.json    ← npm workspaces raíz
├── Makefile
├── docker-compose.yml
├── Dockerfile.backend
└── Dockerfile.nginx
```

El código React vive **solo** en `packages/web/src/`. La app Android construye desde `packages/web/` con `--mode android` y Capacitor en `packages/android/` usa ese `dist/`.

## Comandos esenciales

### Desarrollo local completo
```bash
make dev          # Arranca web (Vite :5173) + backend (tsx watch :3001) en paralelo
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
make android-build   # Build web con --mode android + cap sync android
make android-open    # Abre el proyecto en Android Studio
make android-run     # Instala en dispositivo USB conectado
```
Para generar la APK final: `cd packages/android/android && JAVA_HOME=~/java/jdk-21.0.11+10 ./gradlew assembleDebug`
El APK queda en `packages/android/android/app/build/outputs/apk/debug/app-debug.apk`.

### Backend
```bash
cd packages/backend && npm run dev      # tsx watch (recarga automática)
cd packages/backend && npm run build    # tsc (solo para verificar tipos)
```

### Web frontend
```bash
cd packages/web && npm run dev            # Vite dev server con proxy a :3001
cd packages/web && npm run build          # tsc -b + vite build (producción web)
cd packages/web && npm run build:docker   # Solo vite build (sin tsc, usado en Dockerfile.nginx)
cd packages/web && npm run build:android  # Vite build --mode android (para Capacitor)
cd packages/web && npm run lint           # ESLint
```

### Migraciones de base de datos
`prisma migrate dev` requiere TTY interactivo. En entornos no-interactivos (CI, scripts):
```bash
# Generar SQL sin aplicar
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script > migration.sql

# Aplicar migraciones existentes sin prompts
DATABASE_URL=postgresql://... npx prisma migrate deploy
```

## Arquitectura

### Stack
- **Backend**: Fastify v5 + Prisma + PostgreSQL + Redis + BullMQ (colas async)
- **Web**: React 19 + Vite 8 + Zustand + Axios + PWA (vite-plugin-pwa)
- **Android**: Capacitor 8 (wrappea el build de `packages/web/` con `--mode android`)
- **Infra**: Docker Compose con nginx como reverse proxy (Coolify en producción)

### Estructura del backend (`packages/backend/src/`)
- `server.ts` — punto de entrada, importa `app.ts`
- `app.ts` — registra todos los plugins y rutas de Fastify; aquí va CORS, rate-limit, Bull Board
- `plugins/` — `prisma.ts`, `redis.ts`, `auth.ts` (decorators de Fastify), `requirePro.ts` (feature gate)
- `routes/` — un archivo por dominio; cada ruta valida con Zod
- `services/queue.ts` — BullMQ: cola `gym-tracker-bg-jobs` + worker para emails e importaciones
- `services/email.ts` — Nodemailer; sin SMTP configurado imprime los emails en consola (útil para dev)
- `services/vapid.ts` — claves VAPID para push: lee de env vars o genera y persiste en `SystemConfig` de la BD

### Estructura del web frontend (`packages/web/src/`)
- `api/client.ts` — instancia Axios con `baseURL = VITE_API_URL ?? '/api'`; interceptor de refresh token con singleton para evitar múltiples refreshes simultáneos
- `api/*.ts` — funciones por dominio que llaman al cliente
- `store/index.ts` — tres stores Zustand: `useAuthStore` (auth + user + `isPro()`), `useUIStore` (tema, offline), `useOfflineStore` (cola de escrituras pendientes)
- `hooks/useOfflineSync.ts` — al reconectar, replay en serie de la `offlineStore.queue`
- `hooks/useProAccess.ts` — hook que expone `{ isPro, plan, planExpiresAt, trialEndsAt }`
- `components/views/` — una vista por pantalla (Dashboard, DayView, Routines, etc.)
- `components/layout/AppShell.tsx` — shell principal con bottom nav personalizable
- `components/ui/ProBadge.tsx` — chip "★ PRO" para marcar funciones premium
- `components/ui/ProGate.tsx` — wrapper `mode="blur"` (preview borroso) o `mode="lock"` (card de bloqueo)
- `components/ui/UpgradeModal.tsx` — bottom sheet de upsell contextual

### Flujo de autenticación
JWT de corta duración (access token) + refresh token en `localStorage`. El access token **no se persiste** en Zustand (solo en memoria); al recargar la app se renueva automáticamente usando el refresh token via `/auth/refresh`. El interceptor de Axios usa un singleton `refreshPromise` para serializar múltiples peticiones 401 simultáneas.

### Sistema de monetización (Free + Pro)

**Backend — `packages/backend/src/plugins/requirePro.ts`**

```typescript
checkIsPro(user)   // helper puro: verifica plan='pro' con expiración, O trialEndsAt activo
requirePro(fastify) // Fastify hook: devuelve 403 { code: 'REQUIRES_PRO' } si no es Pro
```

Rutas gateadas: `analytics.*`, `ai.*`, `challenges.*` (todo), `push.subscribe`, `routines.publish`, `users.export`. El soft limit de 3 rutinas custom se verifica en `POST /routines/`.

Endpoints de gestión de plan:
- `POST /users/me/trial` — activa 7 días de prueba (una vez por usuario)
- `POST /users/admin/grant-pro` — requiere `Authorization: Bearer {ADMIN_TOKEN}`; `months: 0` = Pro vitalicio

**⚠️ Fastify hook scope**: `addHook` dentro de un plugin afecta **todas** las rutas de ese scope, incluyendo las registradas antes del hook. Para rutas mixtas (algunas públicas, otras protegidas), usar sub-scope: `await fastify.register(async (auth) => { auth.addHook(...); ... })`.

**Frontend**

`useProAccess()` computa `isPro` desde `user.plan` + `user.planExpiresAt` + `user.trialEndsAt` directamente (no llama al servidor).

Para bloquear una sección entera:
```tsx
<ProGate mode="lock" lockLabel="Función Pro" feature="descripción" />
```

Para mostrar preview borroso con overlay:
```tsx
<ProGate mode="blur" feature="estadísticas avanzadas">
  <MiComponente />
</ProGate>
```

### Capacitor / Android (`packages/android/`)
- Config: `packages/android/capacitor.config.ts` (`appId: com.ludaisca.gymtracker`, `webDir: ../web/dist`)
- Variables de entorno para la APK: `packages/android/.env` (`VITE_API_URL`)
- El WebView usa origen `capacitor://localhost` → el backend debe tener este origen en la lista CORS de producción (ver `packages/backend/src/app.ts`)
- Java 21 requerido: sistema usa Java 25 (incompatible con Gradle/AGP). Configurado en `packages/android/android/gradle.properties` via `org.gradle.java.home`

### Docker / despliegue
- `docker-compose.yml` — configuración base; nginx usa `expose: ["80"]` (sin bind a host)
- `docker-compose.override.yml` — agrega `ports: ["80:80"]` solo para dev local (Docker lo carga automáticamente; Coolify lo ignora)
- `Dockerfile.backend` — multi-stage; el builder usa `npm ci --include=dev` para que `tsc` y `@types/node` estén disponibles aunque Coolify inyecte `NODE_ENV=production` en build time; copia desde `packages/backend/`
- `Dockerfile.nginx` — igual `npm ci --include=dev`; usa `npm run build:docker` (sin tsc); copia desde `packages/web/`
- Coolify enruta el dominio `gym-tracker.ludaisca.ddns.net` a través de su Traefik interno al contenedor nginx

### Variables de entorno
En desarrollo, `.env` está en la raíz del proyecto y el Makefile lo carga con `set -a && . ../../.env && set +a`. Las variables críticas:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL (usa `db:5432` en Docker, `localhost:5432` en dev local) |
| `REDIS_URL` | Redis |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Tokens de acceso y refresco |
| `ENCRYPTION_KEY` | Cifrado de API keys de IA en `UserSettings.aiKey` |
| `ADMIN_TOKEN` | Autenticación para `POST /users/admin/grant-pro` |
