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
