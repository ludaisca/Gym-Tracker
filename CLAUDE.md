# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Rama activa**: v1 | **Producción**: Coolify en `gym-tracker.ludaisca.ddns.net`
**Estado técnico / bugs activos / pendientes**: ver `STATUS.md`

## Estructura del monorepo

```
packages/
├── backend/    ← API Fastify v5 + Prisma + PostgreSQL + Redis
├── web/        ← React 19 PWA (fuente única para web y APK)
└── android/    ← Wrapper Capacitor 8 + proyecto nativo Android
```

El código React vive **solo** en `packages/web/src/`. La APK Android construye desde `packages/web/` con `--mode android`; Capacitor en `packages/android/` apunta a ese `dist/`.

## Comandos esenciales

### Desarrollo local

> El Makefile carga `.env` de la raíz y convierte `@db:5432` → `@localhost:5440` y `@redis:6379` → `@localhost:6390` automáticamente para aislar el dev local de la DB de producción (Coolify ocupa el `127.0.0.1:5432` del host).

```bash
make db-up        # Levanta PostgreSQL local (:5440) + Redis local (:6390) en Docker
make dev          # Web (Vite :5173) + backend (tsx watch :3010) en paralelo
make db-migrate   # prisma migrate dev (requiere TTY)
make db-studio    # Prisma Studio
```

**⚠️ Puerto en dev local vs Makefile**: `make dev` usa el default del servidor (`:3001`). Si se lanza manualmente con `PORT=3010`, actualizar el proxy en `packages/web/vite.config.ts` a ese puerto. El Vite proxy apunta actualmente a `:3010`.

**⚠️ tsx watch pierde env vars al reiniciar**: Si se arranca el backend manualmente (sin Makefile), exportar todas las variables explícitamente antes de `npm run dev`; de lo contrario, los reinicios automáticos de tsx pierden las vars de entorno.

En entornos no-interactivos (CI/scripts), usar `prisma migrate deploy` en lugar de `migrate dev`.

### Producción (Docker Compose)
```bash
make up / make down / make build   # Gestión de contenedores
make logs                          # Logs en vivo de nginx y api
make restart                       # Reinicia solo api y nginx
make backup                        # Dump PostgreSQL → ./backups/
make deploy                        # git pull + rebuild + up
```

### Android (APK)
```bash
make android-build   # vite build --mode android + cap sync android
make android-run     # Instala en dispositivo USB conectado
```
APK final: `cd packages/android/android && JAVA_HOME=~/java/jdk-21.0.7+6 ANDROID_HOME=~/android-sdk ./gradlew assembleDebug`  
Salida: `packages/android/android/app/build/outputs/apk/debug/app-debug.apk`

**Java 21 requerido**: instalado en `~/java/jdk-21.0.7+6` (Temurin). Ruta configurada en `packages/android/android/gradle.properties` via `org.gradle.java.home`.  
**Android SDK**: instalado en `~/android-sdk` (API 36, build-tools 36.0.0). Ruta en `packages/android/android/local.properties`.

### Backend
```bash
cd packages/backend && npm run dev    # tsx watch (recarga automática)
cd packages/backend && npm run build  # tsc — solo verificación de tipos, no produce artefacto usado
```

### Web frontend
```bash
cd packages/web && npm run dev            # Vite dev server, proxy /api → :3010
cd packages/web && npm run build          # tsc -b + vite build
cd packages/web && npm run build:docker   # Solo vite build (sin tsc, usado en Dockerfile.nginx)
cd packages/web && npm run build:android  # vite build --mode android
cd packages/web && npm run lint
```

## Arquitectura

### Stack
- **Backend**: Fastify v5 + Prisma + PostgreSQL + Redis + BullMQ
- **Web**: React 19 + Vite 8 + Zustand + Axios + vite-plugin-pwa
- **Android**: Capacitor 8 wrappea el build de `packages/web/`
- **Infra**: Docker Compose + nginx reverse proxy (Coolify en producción)

### Backend (`packages/backend/src/`)

**Capas de la aplicación**:
- `server.ts` → `app.ts` — punto de entrada; `app.ts` registra todos los plugins y rutas
- `plugins/` — decorators de Fastify: `fastify.prisma`, `fastify.redis`, `fastify.authenticate`, `fastify.repos`
- `repositories/` — interfaces de dominio (`UserRepository`, `SessionRepository`, etc.) + implementaciones Prisma en `repositories/prisma/`
- `use-cases/` — lógica de negocio desacoplada de Fastify (un archivo por dominio)
- `routes/` — validación Zod + orquestación; delega en use-cases o repos directamente
- `services/queue.ts` — BullMQ, cola `gym-tracker-bg-jobs`; monitoreo en `/api/admin/queues`
- `services/email.ts` — Nodemailer; sin SMTP configurado imprime en consola
- `services/vapid.ts` — claves VAPID para push: lee de env vars o genera y persiste en `SystemConfig`

**`fastify.repos` decorator** (`plugins/repositories.ts`): expone instancias únicas de todos los repositorios. Acceder como `fastify.repos.users`, `fastify.repos.sessions`, etc. en lugar de instanciar repos directamente en las rutas.

**Claves compuestas en BD**:
- `WorkoutSession`: `[userId, weekNumber, dayId]`
- `NutritionDay` / `BodyWeight`: `[userId, date]`
- Usar `prisma.upsert` con estos where-clauses exactos para records diarios/semanales.

**⚠️ Redis cache**: `GET /sessions` (historial completo) se cachea en Redis por usuario. Después de cualquier mutación de sesión, llamar `invalidateSessionsCache(userId)` — si no se hace, el cliente recibe datos stale.

**⚠️ Jobs en background**: Operaciones pesadas (emails, importaciones JSON grandes) deben ir a `backgroundQueue` (`services/queue.ts`). No bloquear el event loop del HTTP endpoint.

**⚠️ Fastify hook scope**: `addHook` dentro de un plugin afecta **todas** las rutas del scope, incluyendo las registradas antes del hook. Para rutas mixtas usar sub-scope:
```typescript
await fastify.register(async (scoped) => {
  scoped.addHook('preHandler', requirePro(fastify))
  // rutas protegidas aquí
})
```

**Prefix stripping**: nginx (producción) y el proxy de Vite (dev) **eliminan** el prefijo `/api`. El frontend hace `GET /api/sessions`; el backend recibe `GET /sessions`. Las rutas en Fastify no llevan `/api`.

**rawBody para Stripe webhooks**: el content-type parser en `app.ts` adjunta `req.rawBody` como `Buffer` antes de parsear JSON. El webhook en `/billing/webhook` accede a él via cast explícito.

**TypeScript — Stripe v22 + moduleResolution: node**: El backend usa `moduleResolution: node`, que resuelve el entry CJS de Stripe y expone `StripeConstructor` sin los tipos `Stripe.Subscription`, `Stripe.Event`, etc. Solución: definir interfaces locales y castear con `as unknown as LocalType`. No cambiar el tsconfig.

**Keys de IA por usuario**: las API keys de Anthropic/OpenAI se almacenan *por usuario* en `UserSettings.aiKey`, cifradas con `ENCRYPTION_KEY`. El backend actúa como proxy en `/ai/analyze` — nunca se exponen al frontend.

### Web frontend (`packages/web/src/`)

**Path alias**: `@/` mapea a `packages/web/src/`. Usar imports absolutos `@/api/...`, `@/components/...` en lugar de rutas relativas profundas.

**API layer**
- `api/client.ts` — Axios con `baseURL = VITE_API_URL ?? '/api'`; interceptor de refresh con singleton `refreshPromise` para serializar múltiples 401 simultáneos. **No dejar `VITE_API_URL=""`** — string vacío no activa el nullish coalescing y rompe el proxy.
- Cada dominio tiene su módulo en `api/`: `sessionsApi`, `routinesApi`, `nutritionApi`, etc.

**Estado global** (`store/index.ts`)
- `useAuthStore` — auth + user completo + `accessToken` (solo en memoria, no persiste)
- `useUIStore` — **única** fuente de verdad para `data-theme` y `data-accent` en `<html>`. No mutar estos atributos del DOM directamente.
- `useOfflineStore` — cola de escrituras pendientes para replay al reconectar

**Patrones de data fetching**:
- Datos históricos/globales: llamadas directas a la API + estado local (ej. `sessionsApi.listAll()`)
- Datos reactivos de la semana activa: hooks (`useSessions`, `useRoutines`)
- No mezclar los dos patrones para el mismo recurso.

**Code splitting**: todas las vistas protegidas usan `React.lazy()` en `App.tsx`. No revertir a imports estáticos — evita el warning de chunk >500kB de Vite.

**PWA / Service Worker**: el SW está en modo `prompt`. Las actualizaciones las gestiona `<ReloadPrompt />`. No cambiar a `autoUpdate`.

**Offline sync**: `useOfflineStore` acumula escrituras fallidas; `useOfflineSync` las reproduce en **serie** al reconectar (evita race conditions). No cambiar a reproducción paralela.

**Sistema de iconos** (`components/ui/Icons.tsx`)  
Todos los iconos son SVG inline con `stroke="currentColor"` (monocromáticos, se adaptan al tema). No usar emojis ni iconos de colores. Exporta `ModuleIcon` para el nav. Añadir nuevos iconos siguiendo el mismo patrón (`def()` helper + `IconProps`).

**Sistema de diseño (CSS)**  
Fuentes: `--font-body: Lexend`, `--font-mono: JetBrains Mono`.  
Clases de layout principales: `.card`, `.panel-head`, `.panel-body`, `.summary-card` (con `.status-done/.status-partial/.status-active`), `.split`, `.triple`.  
Para inputs de código/share usar `.code-input` (monoespaciado, letra espaciada, focus-ring primario).  
Para botones de iconos en cards: `.icon-btn-subtle`.  
Para tabs scrollables de página: `.routines-tab-bar` / `.routines-tab-btn` (no reutilizar `.stats-tabs` que usa `flex: 1` y desborda en móvil).

### Monetización

Todas las features son **gratuitas** (`isPro` siempre true en el contexto actual). El backend tiene rutas gateadas con `requirePro` (`analytics.*`, `ai.*`, `challenges.*`, `push.subscribe`, `routines.publish`) pero el gate no se activa desde el frontend.

**Gestión de plan (backend)**:
- `POST /users/me/trial` — 7 días de prueba
- `POST /users/admin/grant-pro` — `Authorization: Bearer {ADMIN_TOKEN}`; `months: 0` = Pro vitalicio
- `POST /billing/checkout` — Stripe Checkout Session; acepta `platform: 'android'` para deep links `gymtracker://`
- `POST /billing/webhook` — eventos Stripe con signature verificada

**Stripe webhook**: `current_period_end` puede ser `undefined` con la API `2026-04-22.dahlia`. Usar `safePeriodEnd(sub)` definida en `billing.ts`.

### Autenticación

JWT de corta duración (access token) + refresh token en `localStorage`. El access token **no se persiste** en Zustand; al recargar la app se renueva automáticamente vía `/auth/refresh`. El interceptor de Axios serializa múltiples 401 simultáneos con un singleton `refreshPromise`.

### Capacitor / Android

- `packages/android/capacitor.config.ts`: `appId: com.ludaisca.gymtracker`, `webDir: ../web/dist`
- Variables para la APK: `packages/android/.env` (`VITE_API_URL` → URL pública del backend, no localhost)
- El WebView usa origen `capacitor://localhost` — debe estar en la lista CORS de producción en `app.ts`
- Plugins instalados: `@capacitor/browser`, `@capacitor/app` (importados lazy para evitar bundle en la web)

### Docker / despliegue

- `docker-compose.yml` — base; nginx usa `expose: ["80"]` (sin bind al host)
- `docker-compose.override.yml` — agrega `ports: ["80:80"]` para dev local (Coolify lo ignora)
- `Dockerfile.backend` — multi-stage; builder usa `npm ci --include=dev` para que `tsc` esté disponible aunque Coolify inyecte `NODE_ENV=production`
- `Dockerfile.nginx` — usa `npm run build:docker` (sin tsc)
- Coolify enruta `gym-tracker.ludaisca.ddns.net` a través de Traefik al contenedor nginx

### Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL (`db:5432` en Docker, `localhost:5432` en dev) |
| `REDIS_URL` | Redis |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Tokens de acceso y refresco |
| `ENCRYPTION_KEY` | Cifrado de API keys de IA en `UserSettings.aiKey` |
| `ADMIN_TOKEN` | `POST /users/admin/grant-pro` |
| `STRIPE_SECRET_KEY` | Clave Stripe (test `sk_test_...` o Restricted Key `rk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret del webhook (`whsec_...`) |
| `STRIPE_PRICE_MONTHLY` | Price ID de Stripe para plan mensual |
| `STRIPE_PRICE_ANNUAL` | Price ID de Stripe para plan anual |
| `APP_URL` | URL base para redirects web de Stripe (fallback si no hay `Origin` header) |
| `APP_DOMAIN` | Dominio de producción para CORS (ej. `gym-tracker.ludaisca.ddns.net`) |

@OPERATIONS.md
