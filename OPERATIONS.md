# OPERATIONS.md

Instrucciones operativas para Gym Tracker. Este archivo complementa CLAUDE.md con problemas concretos que ya ocurrieron y sus soluciones directas.

---

## 1. Entorno local en VPS con Coolify activo

### Conflictos de puertos

Coolify ocupa puertos que parecen disponibles:

- **Puerto `3001`** → mapeado por un contenedor Coolify a Redis interno. **Usar `PORT=3010`** para el backend en dev local.
- **Puerto `5432`** → ocupado por la BD PostgreSQL **de producción** del propio proyecto en Coolify. Si el dev local intentase usar 5432 estaría leyendo/escribiendo en producción. La BD local de dev escucha en `127.0.0.1:5440` (configurado en `docker-compose.override.yml`).
- **Puerto `6379`** → Coolify expone otra Redis ahí; la Redis local de dev escucha en `127.0.0.1:6390`.
- **Puerto `5433`** → ocupado por otra BD de Coolify; no usar.
- **Puertos `80` / `443`** → Traefik de Coolify. No vincular servicios Docker locales a esos puertos.

Para verificar qué está escuchando: `ss -tlnp | grep LISTEN`

### Backend no accesible desde LAN/Tailscale

Vite necesita `server.host: '0.0.0.0'` (ya configurado en `vite.config.ts`).

Rocky Linux tiene `firewalld` activo por defecto. Abrir puertos explícitamente:

```bash
sudo firewall-cmd --zone=public --add-port=5173/tcp --permanent
sudo firewall-cmd --zone=public --add-port=3010/tcp --permanent
sudo firewall-cmd --reload
```

El CORS del backend en dev debe ser `origin: true` (acepta cualquier origen), no una lista fija. Ver `packages/backend/src/app.ts`.

### `tsx watch` pierde variables de entorno al reiniciarse

Cuando `tsx watch` detecta un cambio de archivo, relanza el proceso — y si se lanzó manualmente sin exportar vars, el proceso hijo las pierde.

- **Solución**: usar `make dev` (el Makefile exporta todas las vars antes de lanzar).
- Si se lanza manual: `set -a && . .env && set +a && npm run dev`

### `VITE_API_URL=""` rompe el proxy

`import.meta.env.VITE_API_URL ?? '/api'` — el operador `??` solo activa el fallback con `null` o `undefined`, **no con string vacío**.

- **Solución**: omitir `VITE_API_URL` completamente en el `.env` si se quiere usar el default `/api`. Nunca asignarla a `""`.

---

## 2. Coolify (producción)

Documentación oficial: https://coolify.io/docs

### Cómo funciona el routing

Coolify corre su propio Traefik que intercepta tráfico HTTP/HTTPS en el VPS.

- `docker-compose.yml` usa `expose: ["80"]` (sin `ports:`). Traefik enruta el dominio al contenedor nginx.
- `docker-compose.override.yml` agrega `ports: ["80:80"]` solo para dev local. **Coolify ignora `override.yml`** — no lo lee ni lo aplica.

### Variables de entorno en producción

Se configuran en la UI de Coolify: Settings → Environment Variables del servicio. No se leen del archivo `.env` local en producción.

### Build con `NODE_ENV=production`

Coolify inyecta `NODE_ENV=production` durante el build. Los Dockerfiles usan `npm ci --include=dev` explícitamente para que `tsc`, `@types/node` y otras devDependencies estén disponibles aunque `NODE_ENV=production` esté activo.

### Nuevo deploy

```bash
make deploy   # git pull + rebuild + up
```

O desde la UI de Coolify con el botón "Redeploy".

### Migraciones en producción

El entrypoint del contenedor debe correr `prisma migrate deploy` (no `migrate dev`) antes de iniciar el servidor. `migrate dev` requiere TTY interactivo y cuelga en CI/scripts.

---

## 3. Base de datos

### `prisma migrate dev` cuelga en scripts

Requiere TTY interactivo para pedir el nombre de la migración.

- En producción/scripts: `npx prisma migrate deploy`
- Para generar SQL sin aplicar:
  ```bash
  npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
    --to-schema-datamodel prisma/schema.prisma --script > migration.sql
  ```

### Cambios en schema no reflejados en el cliente TypeScript

Siempre correr `npx prisma generate` después de cambiar `schema.prisma` (o usar `migrate dev` que lo hace automáticamente).

---

## 4. Stripe

### Dev local — reenvío de webhooks

```bash
stripe listen --forward-to http://localhost:3010/billing/webhook
```

El signing secret (`whsec_...`) que imprime el CLI es distinto al de producción — exportarlo como `STRIPE_WEBHOOK_SECRET` antes de lanzar el backend.

### `checkout.session.completed` devuelve 500 "Invalid Date"

**Causa**: `current_period_end` es `undefined` con la API `2026-04-22.dahlia` en ciertos contextos de webhook.

**Solución**: usar `safePeriodEnd(sub)` definida en `packages/backend/src/routes/billing.ts`. Nunca usar `new Date(sub.current_period_end * 1000)` directamente.

### TypeScript errors con Stripe SDK v22

Con `moduleResolution: node`, TypeScript resuelve al entry CJS (`StripeConstructor`) que no exporta `Stripe.Subscription`, `Stripe.Event`, ni `Stripe.Checkout.Session`.

**Solución**: definir interfaces locales (`SubLike`, `CheckoutSessionLike`, `StripeEventLike`) y usar `as unknown as LocalType`. Ver `packages/backend/src/routes/billing.ts`.

---

## 5. Android / Capacitor

### Gradle falla con "Unsupported class file major version"

Java 25 (instalado en el sistema) es incompatible con AGP/Gradle. Java 21 es requerido.

**Solución**: ya configurado en `packages/android/android/gradle.properties`:
```
org.gradle.java.home=/home/luis/java/jdk-21.0.7+6
```
Si falla, lanzar manualmente:
```bash
JAVA_HOME=~/java/jdk-21.0.7+6 ANDROID_HOME=~/android-sdk ./gradlew assembleDebug
```
⚠️ La ruta correcta es `jdk-21.0.7+6`, no `jdk-21.0.11+10` (ese no existe en esta máquina).

### Android SDK no encontrado (`native-run: ERR_SDK_NOT_FOUND`)

`npx cap run android` no detecta el SDK si `ANDROID_HOME` no está exportado.

**Solución**:
```bash
ANDROID_HOME=~/android-sdk npx cap run android
```
O instalar directamente con adb:
```bash
ANDROID_HOME=~/android-sdk /home/luis/android-sdk/platform-tools/adb install -r \
  packages/android/android/app/build/outputs/apk/debug/app-debug.apk
```

### APK apuntando a localhost en producción

`VITE_API_URL` en `packages/android/.env` debe apuntar a la URL pública del backend:
```
VITE_API_URL=https://gym-tracker.ludaisca.ddns.net/api
```

### Status bar solapa el contenido (bug resuelto)

**Causa**: Capacitor por defecto tiene `overlaysWebView: true` — el WebView se renderiza bajo la barra de estado. Sin CSS `env(safe-area-inset-top)`, el contenido queda oculto.

**Solución aplicada**: `packages/android/capacitor.config.ts`:
```typescript
plugins: {
  StatusBar: { overlaysWebView: false, style: 'dark', backgroundColor: '#171614' }
}
```
Con esto Android reserva el espacio automáticamente. No se necesita CSS adicional para la parte superior.

### Status bar no sincroniza con el tema de la app

**Causa**: `overlaysWebView: false` fija el color inicialmente, pero al cambiar tema (oscuro ↔ claro) la barra del sistema no actualiza.

**Solución aplicada** (`App.tsx`): `updateNativeStatusBar(theme)` llama a `StatusBar.setStyle()` y `StatusBar.setBackgroundColor()` en cada cambio de tema. Todos los imports de Capacitor son lazy (`await import(...)`) para no romper el bundle web.

### `i.map is not a function` crash en pantalla Rutinas (sin resolver definitivamente)

El crash ocurre en un `useMemo` de `Routines.tsx`. Se aplicaron guards defensivos:
- `useRoutines.ts`: `Array.isArray(data) ? data : []` antes de `setCustomRoutines`
- `Routines.tsx`: mismos guards en `load()` y en el useMemo de `customs`

La causa raíz no está confirmada. Para depurar:
```bash
adb logcat | grep -i "gymtracker\|capacitor\|chromium"
```

### Firebase / FCM setup

1. Proyecto Firebase: `gym-tracker-5b5ae` | Package: `com.ludaisca.gymtracker`
2. `google-services.json` → `packages/android/android/app/` (ya en repo, gitignoreado ⚠️)
3. Service account JSON → variable de entorno `FIREBASE_SERVICE_ACCOUNT` (en `.env` local + Coolify)
4. En producción: añadir `FIREBASE_SERVICE_ACCOUNT` en Coolify → Environment Variables antes de deploy

### Migración de DB para FCM (pendiente en producción)

Los campos `fcmToken` y `reminderTime` se añadieron al schema pero la migración solo se aplicó en dev local. En producción ejecutar:
```bash
cd packages/backend && npx prisma migrate deploy
```
O desde el contenedor Coolify.

---

## 6. Errores del primer deploy en Coolify (2026-05-22)

### Lock file mismatch en Docker build (`npm ci` falla)

**Causa**: npm workspaces gestiona los paquetes desde el lock file de la raíz (`/package-lock.json`), no desde `packages/web/package-lock.json`. Los Dockerfiles copiaban el lock file del paquete (`package*.json`) que estaba desincronizado.

**Síntoma**:
```
npm error Missing: @capacitor/camera@8.2.0 from lock file
npm error Missing: @capacitor/status-bar@8.0.2 from lock file
```

**Solución**: Cambiar `npm ci` → `npm install` en ambos Dockerfiles y copiar solo `package.json` (no `package*.json`). Eliminar el lock file stale `packages/web/package-lock.json`.

---

### Módulos `@capacitor/*` no resueltos en build de Docker

**Causa**: Los packages de Capacitor usados en `packages/web/src/` (`@capacitor/app`, `@capacitor/core`, `@capacitor/push-notifications`, `@capacitor/browser`) no estaban declarados en `packages/web/package.json`. En dev funcionaban vía workspace heredado de `packages/android/`, pero el Docker build instala solo lo que hay en el `package.json` del paquete.

**Síntoma**:
```
Error: [vite]: Rolldown failed to resolve import "@capacitor/app" from "/app/src/App.tsx".
```

**Solución**: Añadir los 4 packages faltantes a `dependencies` de `packages/web/package.json` con las mismas versiones que en `packages/android/package.json`.

---

### Columna `UserSettings.fcmToken` no existe en producción

**Causa**: La migración de FCM (`fcmToken`, `reminderTime`) se creó localmente con `prisma migrate dev` pero el archivo SQL no se commiteó al repositorio. `prisma migrate deploy` en producción no la encontró.

**Síntoma**:
```
PrismaClientKnownRequestError: The column `UserSettings.fcmToken` does not exist in the current database.
```
Todos los logins devolvían 500. El job `reminder-scan` fallaba cada 60s.

**Solución**: Crear manualmente el archivo de migración `prisma/migrations/20260522000000_add_fcm_fields/migration.sql` con:
```sql
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "fcmToken" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "reminderTime" TEXT;
```
Commitear y redesplegar. `prisma migrate deploy` lo aplica al arrancar el contenedor.

**Prevención**: Siempre commitear los archivos de migración generados por `prisma migrate dev` junto con el cambio de schema.

---

### Rate limit acumulado entre deploys bloquea login

**Causa**: `@fastify/rate-limit` guarda contadores en Redis. Al redesplegar sin reiniciar Redis, los contadores de intentos fallidos (del deploy roto anterior) persisten. La ventana de login es 3 intentos / 15 minutos.

**Síntoma**: "Demasiadas peticiones. Intenta en un momento." nada más arrancar el nuevo contenedor, aunque la BD ya está bien.

**Solución rápida**: Limpiar contadores de Redis en el VPS:
```bash
docker exec $(docker ps --filter "name=redis-l7qk" -q) \
  redis-cli -a "$REDIS_PASSWORD" --no-auth-warning FLUSHDB
```
O esperar 15 minutos a que expire la ventana.

**Bug asociado**: El error handler de Fastify recibía el error 429 del plugin y lo re-enviaba como 500 (el plugin ya había enviado 429 al cliente). Corregido añadiendo guard `if (!reply.sent)` en el error handler para el caso `statusCode === 429`.

---

### `packages/web/.env.android` — archivo necesario para APK

**Causa**: `vite build --mode android` carga `packages/web/.env.android`, no `packages/android/.env`. Sin este archivo `VITE_API_URL` no se inyecta y el APK apunta a la URL incorrecta.

**Solución**: Crear `packages/web/.env.android` con:
```
VITE_API_URL=https://gym-tracker.ludaisca.ddns.net/api
```
Este archivo **no debe commitearse** (contiene la URL de producción hardcoded).

---

## 7. Refactorización Android-only (2026-05-26)

### Activar live reload de Capacitor (HMR en el teléfono sin recompilar APK)

**Problema**: Cada cambio en la UI requería recompilar la APK (~2-3 min).

**Solución**: Capacitor soporta un bloque `server` en `capacitor.config.ts` que hace que el WebView cargue desde el Vite dev server en lugar de los assets bundleados. Solo hay que compilar la APK UNA VEZ con esa config; después cualquier cambio en React aparece instantáneamente.

**Cómo activar**:
```bash
make android-dev-build        # detecta IP (Tailscale > LAN), compila e instala APK
make dev                      # arranca Vite :5173 + backend :3010
# Abrir la app → carga desde http://<ip>:5173 → HMR instantáneo
```

Para forzar una IP específica: `make android-dev-build DEV_IP=100.x.x.x`

**Archivos clave**:
- `packages/android/capacitor.config.ts` — bloque `server` condicional con `LIVE_RELOAD_IP`
- `packages/android/android/app/src/main/res/xml/network_security_config.xml` — cleartext permitido para que HTTP a la IP local funcione
- `Makefile` — target `android-dev-build`, detección automática de IP Tailscale/LAN

**Nota**: `android-build` (sin `dev`) genera la APK de producción con assets bundleados y `VITE_API_URL` de producción (no activa live reload).

---

### Eliminar nginx de producción

**Problema**: El contenedor nginx era el único propósito era servir la web PWA y actuar como proxy hacia la API. Al eliminar la app web, nginx se volvió innecesario.

**Cambios**:
- Eliminados: `Dockerfile.nginx`, `nginx/nginx.conf`, servicio `nginx` de `docker-compose.yml` y `docker-compose.override.yml`
- Traefik de Coolify debe enrutar `gym-tracker.ludaisca.ddns.net` directamente a `api:3001`

**⚠️ Acción requerida en Coolify tras deploy**: En la UI de Coolify, actualizar el servicio para que Traefik apunte al contenedor `api` en el puerto `3001` (antes apuntaba a `nginx:80`).

**Funciones de nginx compensadas por el backend** (ya estaban activas):
- Rate limiting: `@fastify/rate-limit` (Redis-backed)
- Compresión: `@fastify/compress`
- Seguridad: `@fastify/helmet`

**Rate limit de auth más estricto**: nginx tenía 5 req/min para `/api/auth/`. Si se necesita en el backend, agregar en `routes/auth.ts`:
```typescript
{ config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }
```

---

### Eliminar Web Push (VAPID) y código web-only

**Archivos eliminados**:
- `packages/backend/src/services/vapid.ts`
- `packages/backend/src/use-cases/push.ts`
- `packages/backend/src/repositories/PushRepository.ts`
- `packages/backend/src/repositories/prisma/PrismaPushRepository.ts`
- `packages/web/src/components/ui/ReloadPrompt.tsx`
- `packages/web/public/push-handler.js`
- `packages/web/public/apple-touch-icon.png`
- `web-push` npm package (backend), `vite-plugin-pwa` + `workbox-window` (frontend)

**Endpoints eliminados del backend**: `GET /push/vapid-public-key`, `POST /push/subscribe`, `DELETE /push/unsubscribe`

**Simplificaciones**:
- `isNativePlatform()` eliminado de todos los archivos (siempre Android)
- Duelos.tsx: eliminada rama `getUserMedia` (solo cámara nativa Capacitor)
- Config.tsx: eliminada sección "Notificaciones Push" (VAPID); sección "Recordatorio" ahora siempre visible
