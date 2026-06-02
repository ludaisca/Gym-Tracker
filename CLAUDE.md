# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Rama activa**: v1 | **Producción**: Coolify en `gym-tracker.ludaisca.ddns.net`
**Estado técnico / bugs activos / pendientes**: ver `STATUS.md`

---

## Regla de documentación — obligatoria

**Cada vez que se encuentre y resuelva un error, documentarlo en `OPERATIONS.md` antes de cerrar la sesión.** Formato mínimo:

```
### Título del problema
**Causa**: qué lo provoca.
**Síntoma**: qué ve el usuario / qué aparece en el log.
**Solución**: comando o cambio de código exacto.
```

---

## Infraestructura

| Campo | Valor |
|---|---|
| URL pública | `https://gym-tracker.ludaisca.ddns.net` |
| SO del host | Rocky Linux 10 (kernel 6.12) |
| PaaS | Coolify 4.x (auto-gestiona Traefik + Docker) |
| Routing prod | Internet → Traefik → `api:3001` (sin nginx) |
| Contenedores | `api`, `db`, `redis`, `db-backup` |

**Puertos ocupados en host** (no usar): `5432` (PostgreSQL prod), `6379`/`3001` (Redis Coolify), `80`/`443` (Traefik).

**Dev local** en el mismo VPS:

| Servicio | Puerto |
|---|---|
| PostgreSQL dev | `127.0.0.1:5440` |
| Redis dev | `127.0.0.1:6390` |
| Backend (`tsx watch`) | `:3010` |
| Frontend (Vite) | `:5173` |

---

## Comandos esenciales

```bash
# Desarrollo local
make db-up          # Levanta PostgreSQL :5440 + Redis :6390 en Docker
make dev            # Vite :5173 + backend :3010 en paralelo (carga .env y reescribe URLs)
make db-migrate     # prisma migrate dev (requiere TTY)
make db-studio      # Prisma Studio

# Android — Live Reload (compilar APK UNA SOLA VEZ, luego HMR instantáneo)
make android-dev-build          # Detecta IP (Tailscale > LAN), compila e instala APK
make android-dev-build DEV_IP=x # Forzar IP específica
# Luego: make dev → abrir app → cambios en React se reflejan al instante

# Android — Producción
make android-build  # vite build --mode android + cap sync
make android-run    # Instala en dispositivo USB

# Producción (Docker)
make deploy         # git pull + rebuild + up
make logs           # Logs en vivo de api
make restart        # Reinicia solo api
make backup         # Dump PostgreSQL → ./backups/
```

**⚠️ `make dev` es obligatorio para dev local** — reescribe `@db:5432→@localhost:5440` y `@redis:6379→@localhost:6390`, y exporta `PORT=3010`. Sin él, el backend puede conectarse a la BD de producción.

**Backend manual** (sin Makefile): `set -a && . .env && set +a && npm run dev` — `tsx watch` pierde env vars al reiniciarse si no se exportan antes.

---

## Estructura del monorepo

```
packages/
├── backend/    ← API Fastify v5 + Prisma + PostgreSQL + Redis
├── web/        ← React 19 + Vite (UI de la APK Android; no es PWA web)
└── android/    ← Wrapper Capacitor 8 + proyecto nativo Android
```

El único cliente es la **APK Android**. `packages/web/dist/` se empaqueta en la APK vía Capacitor. No hay app web.

---

## Backend (`packages/backend/src/`)

### Capas

```
server.ts → app.ts          Punto de entrada; app.ts registra plugins y rutas
plugins/                    Fastify decorators: prisma, redis, authenticate, repos
repositories/               Interfaces de dominio + implementaciones Prisma (repositories/prisma/)
use-cases/                  Lógica de negocio desacoplada de Fastify
routes/                     Validación Zod + orquestación → delega en use-cases o repos
services/queue.ts           BullMQ — cola gym-tracker-bg-jobs + job reminder-scan (cada 60s)
services/fcm.ts             Firebase Admin SDK para push nativo Android
services/email.ts           Nodemailer (imprime en consola sin SMTP configurado)
```

### Plugins (`fastify.X`)

- `fastify.prisma` — cliente Prisma
- `fastify.redis` — cliente ioredis
- `fastify.authenticate` — decorator JWT para `addHook('onRequest', ...)`
- `fastify.repos` — instancias únicas de todos los repositorios: `users`, `routines`, `sessions`, `nutrition`, `notes`, `challenges`. Usar siempre en lugar de instanciar repos directamente.

### Rutas registradas

| Prefix | Archivo |
|---|---|
| `/auth` | `routes/auth.ts` |
| `/users` | `routes/users.ts` |
| `/sessions` | `routes/sessions.ts` |
| `/routines` | `routes/routines.ts` |
| `/notes` | `routes/notes.ts` |
| `/nutrition` | `routes/nutrition.ts` |
| `/ai` | `routes/ai.ts` |
| `/goals` | `routes/goals.ts` |
| `/push` | `routes/push.ts` |
| `/analytics` | `routes/analytics.ts` |
| `/marketplace` | `routes/marketplace.ts` |
| `/` | `routes/challenges.ts` |
| `/admin/queues` | Bull Board (requiere `ADMIN_TOKEN`) |

### Claves compuestas en BD

- `WorkoutSession`: `@@unique([userId, weekNumber, dayId])`
- `NutritionDay` / `BodyWeight`: `@@unique([userId, date])`
- `LiftGoal`: `@@unique([userId, exerciseName])`

Usar `prisma.upsert` con los where-clauses exactos.

### Gotchas críticos de backend

**Redis cache de sesiones**: `GET /sessions` (historial) se cachea por usuario. Tras cualquier mutación, llamar `invalidateSessionsCache(userId)` — si no, el cliente recibe datos stale.

**Fastify hook scope**: `addHook` dentro de un plugin afecta todas las rutas del scope, incluidas las registradas antes del hook. Para rutas mixtas (protegidas y públicas), usar sub-scope:
```typescript
await fastify.register(async (scoped) => {
  scoped.addHook('onRequest', fastify.authenticate)
  // rutas protegidas aquí
})
```

**Prefix stripping**: Vite proxy elimina `/api` antes de reenviar al backend. El frontend llama `GET /api/sessions`; el backend recibe `GET /sessions`. Las rutas en Fastify no llevan `/api`.

**`sanitizeUser()`** (`use-cases/users.ts`): elimina `passwordHash`, tokens internos, y enmascara `aiKey` → `aiKeySet: boolean`. Usar siempre al devolver un objeto `user` al cliente.

**Jobs en background**: emails e imports pesados deben ir a `backgroundQueue` — no bloquear el event loop del endpoint HTTP.

**TypeScript + Stripe v22 + `moduleResolution: node`**: usar interfaces locales y castear con `as unknown as LocalType`. No cambiar el tsconfig.

**Keys de IA por usuario**: `UserSettings.aiKey` cifrada con `ENCRYPTION_KEY`. El backend actúa de proxy en `/ai/analyze` — nunca se exponen al frontend.

---

## Frontend (`packages/web/src/`)

### Path alias

`@/` → `packages/web/src/`. Usar imports absolutos.

### API layer

- `api/client.ts` — Axios con `baseURL = VITE_API_URL ?? '/api'`. Interceptor de refresh con singleton `refreshPromise`. **`VITE_API_URL=""` rompe el proxy** — `??` no activa con string vacío; omitirla completamente para usar el default.
- Un módulo por dominio: `sessionsApi`, `routinesApi`, `goalsApi`, etc.

### Estado global (`store/index.ts`)

| Store | Responsabilidad |
|---|---|
| `useAuthStore` | auth + `user` completo + `accessToken` (solo memoria, no persiste) |
| `useUIStore` | única fuente de verdad para `data-theme` y `data-accent` en `<html>` |
| `useOfflineStore` | cola de escrituras pendientes (hasta 200, TTL 7d) |

No mutar `data-theme`/`data-accent` directamente — pasar siempre por `useUIStore`.

### Data fetching

- Semana activa: hooks (`useSessions`, `useRoutines`) con optimistic update
- Datos históricos/globales: llamadas directas a la API + estado local
- No mezclar los dos patrones para el mismo recurso

`useEnsuredSession`: carga o construye la sesión del día actual; debounce de 800ms antes de persistir.

### Offline sync

`useOfflineStore` acumula escrituras fallidas; `useOfflineSync` las reproduce en **serie** al reconectar. No cambiar a reproducción paralela (race conditions).

### Code splitting

Todas las vistas protegidas usan `React.lazy()` en `App.tsx`. No revertir a imports estáticos.

### Sistema de iconos

`components/ui/Icons.tsx` — SVG inline con `stroke="currentColor"`. Añadir nuevos con el helper `def()`.

### Sistema de diseño (`styles/globals.css`)

Fuentes: `--font-body: Lexend`, `--font-mono: JetBrains Mono`.

Tokens clave: `--color-bg/surface/surface-2/border/divider/text/text-muted`, `--radius-sm/md/lg/xl/2xl/full`, `--shadow-sm/md`, `--transition`.

Clases de layout: `.card`, `.panel-head`, `.panel-body`, `.split`, `.triple`, `.kpis`, `.summary-card`.
Clases especiales: `.code-input`, `.icon-btn-subtle`, `.routines-tab-bar/.routines-tab-btn`, `.pr-table`, `.empty-state`, `.achievement-card`, `.plate-calc-overlay`.

**`.card` en dark mode**: `border-color: transparent; box-shadow: var(--shadow-md)`. No añadir `box-shadow` al `.card` base (ruido visual en claro).

### Layout móvil crítico

En `@media (max-width: 700px)`:
- `.topbar`: `position: fixed; top: env(safe-area-inset-top)` — NO `sticky` (Chrome Android lo rompe cuando un ancestro tiene `overflow-x: hidden`)
- `.main`: `padding-top: calc(56px + env(safe-area-inset-top))`
- `body::before`: `position: fixed; height: env(safe-area-inset-top); z-index: 1001` — rellena la zona de status bar con `--color-bg`
- `.fullscreen-menu`: `top: env(safe-area-inset-top)` (no `top: 0`)

---

## Capacitor / Android

- `packages/android/capacitor.config.ts`: `appId: com.ludaisca.gymtracker`, `webDir: ../web/dist`
- WebView usa origen `capacitor://localhost` — debe estar en CORS de producción en `app.ts`
- Plugins: `@capacitor/app`, `@capacitor/browser`, `@capacitor/status-bar`, `@capacitor/camera`, `@capacitor/push-notifications` — todos importados **lazy** para no romper el bundle web

### Status bar (crítico — `Style` enum es contra-intuitivo)

`Style.Dark` = "Light text for dark backgrounds" → **iconos blancos** → usar con tema oscuro  
`Style.Light` = "Dark text for light backgrounds" → **iconos negros** → usar con tema claro

```typescript
await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
```

Config inicial en `capacitor.config.ts`: `style: 'dark'` (app default es tema oscuro → iconos blancos).

Android 15+ (API 35+) fuerza edge-to-edge. `overlaysWebView: true` es la configuración correcta; compensar con CSS `env(safe-area-inset-top)`.

### Live reload en desarrollo

`capacitor.config.ts` tiene bloque `server` condicional activado con `LIVE_RELOAD_IP`. `make android-dev-build` detecta IP automáticamente y compila e instala la APK. Después `make dev` da HMR instantáneo sin recompilar la APK.

### Java y Android SDK

- Java 21 requerido: `~/java/jdk-21.0.7+6` (Temurin). Configurado en `gradle.properties`.
- Android SDK: `~/android-sdk` (API 36). Configurado en `local.properties`.
- APK final: `packages/android/android/app/build/outputs/apk/debug/app-debug.apk`

### FCM / Push

`lib/pushNative.ts` — inicialización FCM en Capacitor. Token guardado en `UserSettings.fcmToken`. Job `reminder-scan` (BullMQ, cada 60s) escanea usuarios con `reminderTime == HH:MM UTC` actual y envía notificación.

---

## Docker / Producción

```yaml
# Servicios: api, db, redis, db-backup (sin nginx)
# docker-compose.override.yml expone db:5440 y redis:6390 al host (Coolify lo ignora)
# Dockerfile.backend: npm ci --include=dev (para que tsc esté disponible con NODE_ENV=production)
```

Migraciones en producción: `npx prisma migrate deploy` (no `migrate dev` — requiere TTY).

---

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL (`db:5432` en Docker, `localhost:5440` en dev) |
| `REDIS_URL` | Redis |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Access y refresh tokens |
| `ENCRYPTION_KEY` | Cifrado de `UserSettings.aiKey` |
| `ADMIN_TOKEN` | Acceso a Bull Board y `POST /users/admin/grant-pro` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Pagos Stripe |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` | Price IDs de Stripe |
| `APP_URL` | URL base para links de email y redirects Stripe |
| `APP_DOMAIN` | Dominio de prod para CORS (ej. `gym-tracker.ludaisca.ddns.net`) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo de service account Firebase (FCM) — una sola línea |
| `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` | Nodemailer (`mail.ludaisca.com:465`) |

---

## Monetización

Todas las features son **gratuitas** (`isPro` siempre true en el cliente actual). El backend tiene `requirePro` gateando `analytics.*`, `ai.*`, `challenges.*`, `push.subscribe`, `routines.publish`, pero no se activa desde el frontend.

@OPERATIONS.md
