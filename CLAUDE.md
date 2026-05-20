# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Rama activa**: v1 | **Producción**: Coolify en `gym-tracker.ludaisca.ddns.net`

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

> El Makefile carga `.env` de la raíz y convierte `@db:` → `@localhost:` y `@redis:` → `@localhost:` automáticamente.

```bash
make db-up        # Levanta PostgreSQL (:5432) + Redis (:6379) en Docker
make dev          # Web (Vite :5173) + backend (tsx watch :3001) en paralelo
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
APK final: `cd packages/android/android && JAVA_HOME=~/java/jdk-21.0.11+10 ./gradlew assembleDebug`  
Salida: `packages/android/android/app/build/outputs/apk/debug/app-debug.apk`

**Java 21 requerido**: el sistema tiene Java 25 (incompatible con Gradle/AGP). La ruta está configurada en `packages/android/android/gradle.properties` via `org.gradle.java.home`.

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

- `server.ts` → `app.ts` — punto de entrada; `app.ts` registra todos los plugins y rutas
- `plugins/prisma.ts`, `plugins/redis.ts`, `plugins/auth.ts` — decorators de Fastify (`fastify.prisma`, `fastify.redis`, `fastify.authenticate`)
- `plugins/requirePro.ts` — `checkIsPro(user)` (helper puro) + `requirePro(fastify)` (preHandler hook que devuelve 403 con `code: 'REQUIRES_PRO'`)
- `routes/` — un archivo por dominio, validación con Zod en cada ruta
- `routes/billing.ts` — Stripe Checkout Sessions + portal + webhook; usa tipos locales en lugar del namespace `Stripe.*` (ver nota TypeScript abajo)
- `services/queue.ts` — BullMQ, cola `gym-tracker-bg-jobs`, worker para emails e importaciones
- `services/email.ts` — Nodemailer; sin SMTP configurado imprime en consola
- `services/vapid.ts` — claves VAPID para push: lee de env vars o genera y persiste en `SystemConfig`

**⚠️ Fastify hook scope**: `addHook` dentro de un plugin afecta **todas** las rutas del scope, incluyendo las registradas antes del hook. Para rutas mixtas usar sub-scope:
```typescript
await fastify.register(async (scoped) => {
  scoped.addHook('preHandler', requirePro(fastify))
  // rutas protegidas aquí
})
```

**rawBody para Stripe webhooks**: el content-type parser en `app.ts` adjunta `req.rawBody` como `Buffer` antes de parsear JSON. El webhook en `/billing/webhook` accede a él via cast explícito.

**TypeScript — Stripe v22 + moduleResolution: node**: El backend usa `moduleResolution: node`, que resuelve el entry CJS de Stripe y expone `StripeConstructor` sin los tipos `Stripe.Subscription`, `Stripe.Event`, etc. Solución: definir interfaces locales que describan solo los campos necesarios y castear con `as unknown as LocalType`. No cambiar el tsconfig.

### Web frontend (`packages/web/src/`)

**API layer**
- `api/client.ts` — Axios con `baseURL = VITE_API_URL ?? '/api'`; interceptor de refresh con singleton `refreshPromise` para serializar múltiples 401 simultáneos. **No dejar `VITE_API_URL=""`** — string vacío no activa el nullish coalescing y rompe el proxy.
- `api/billing.ts` — `createCheckout(plan, platform?)`: pasa `platform: 'android'` desde APK para recibir URLs con scheme `gymtracker://`

**Estado global** (`store/index.ts`)
- `useAuthStore` — auth + user completo + `accessToken` (solo en memoria, no persiste)
- `useUIStore` — tema, modo offline
- `useOfflineStore` — cola de escrituras pendientes para replay al reconectar

**Hooks clave**
- `useProAccess()` — computa `isPro` desde `user.plan + planExpiresAt + trialEndsAt` (sin llamada al servidor)
- `useOfflineSync.ts` — al reconectar, reproduce la queue en serie
- `useStripeCheckout.ts` — detecta `Capacitor.isNativePlatform()`: en APK abre Chrome Custom Tab via `@capacitor/browser` y escucha deep link de retorno via `@capacitor/app`

**Sistema de iconos** (`components/ui/Icons.tsx`)  
Todos los iconos son SVG inline con `stroke="currentColor"` (monocromáticos, se adaptan al tema). No usar emojis ni iconos de colores. Exporta `ModuleIcon` para el nav. Añadir nuevos iconos siguiendo el mismo patrón (`def()` helper + `IconProps`).

**Sistema Pro**
- `<ProGate mode="lock" lockLabel="..." feature="..." />` — card bloqueada con `<IconLock />`
- `<ProGate mode="blur" feature="...">` — preview borroso con overlay
- `<ProBadge size="sm|md" />` — chip "★ PRO" inline
- `<UpgradeModal feature="..." onClose={...} />` — bottom sheet de upsell

**Sistema de diseño (CSS)**  
Fuentes: `--font-body: Lexend`, `--font-mono: JetBrains Mono`.  
Clases de layout principales: `.card`, `.panel-head`, `.panel-body`, `.summary-card` (con `.status-done/.status-partial/.status-active`), `.split`, `.triple`.  
Para inputs de código/share usar `.code-input` (monoespaciado, letra espaciada, focus-ring primario).  
Para botones de iconos en cards: `.icon-btn-subtle` dentro de `.routine-actions`.

### Autenticación

JWT de corta duración (access token) + refresh token en `localStorage`. El access token **no se persiste** en Zustand; al recargar la app se renueva automáticamente vía `/auth/refresh`. El interceptor de Axios serializa múltiples 401 simultáneos con un singleton `refreshPromise`.

### Monetización (Free + Pro)

**Rutas gateadas con `requirePro`**: `analytics.*`, `ai.*`, `challenges.*` (todo), `push.subscribe`, `routines.publish`, `users.export`.  
**Soft limit**: 3 rutinas custom verificado en `POST /routines/`.

**Gestión de plan (backend)**:
- `POST /users/me/trial` — 7 días de prueba, una vez por usuario
- `POST /users/admin/grant-pro` — `Authorization: Bearer {ADMIN_TOKEN}`; `months: 0` = Pro vitalicio
- `POST /billing/checkout` — crea Stripe Checkout Session; acepta `platform: 'android'` para deep links `gymtracker://`
- `POST /billing/portal` — redirige al Stripe Billing Portal
- `POST /billing/webhook` — recibe eventos Stripe (signature verificada); maneja `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

**Stripe webhook**: `current_period_end` puede ser `undefined` con la API `2026-04-22.dahlia`. Usar `safePeriodEnd(sub)` definida en `billing.ts` que hace fallback a +1 mes/año.

**APK payments**: el hook `useStripeCheckout` envía `platform: 'android'`, el backend responde con `success_url: 'gymtracker://upgrade?success=1'`. El AndroidManifest tiene un `<intent-filter>` para el scheme `gymtracker://`. Al retornar del Custom Tab, `App.addListener('appUrlOpen')` captura la URL y navega.

### Capacitor / Android

- `packages/android/capacitor.config.ts`: `appId: com.ludaisca.gymtracker`, `webDir: ../web/dist`
- Variables para la APK: `packages/android/.env` (`VITE_API_URL`)
- El WebView usa origen `capacitor://localhost` — debe estar en la lista CORS de producción en `app.ts`
- Plugins instalados: `@capacitor/browser`, `@capacitor/app` (importados lazy en `useStripeCheckout.ts` para evitar bundle en la web)

### Docker / despliegue

- `docker-compose.yml` — base; nginx usa `expose: ["80"]` (sin bind al host)
- `docker-compose.override.yml` — agrega `ports: ["80:80"]` para dev local (Coolify lo ignora)
- `Dockerfile.backend` — multi-stage; builder usa `npm ci --include=dev` para que `tsc` esté disponible aunque Coolify inyecte `NODE_ENV=production`
- `Dockerfile.nginx` — ídem; usa `npm run build:docker` (sin tsc)
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

### Stripe — producción (pasos manuales)

1. Crear precios en live mode en el Dashboard de Stripe
2. Registrar webhook endpoint `https://gym-tracker.ludaisca.ddns.net/api/billing/webhook` con eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copiar el `whsec_live_...` al env `STRIPE_WEBHOOK_SECRET` en Coolify
4. Usar Restricted API Key (no secret key) con permisos: Checkout Sessions (write), Customers (write), Subscriptions (read), Billing Portal (write)

@OPERATIONS.md
