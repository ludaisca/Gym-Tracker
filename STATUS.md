# STATUS.md — Gym Tracker v1

> Estado técnico real del proyecto. Documento vivo actualizado a 2026-05-27.
> Sustituye a PLAN.md.

---

## Estado general

**Rama activa**: `v1` | **Producción**: Coolify en `gym-tracker.ludaisca.ddns.net`
**APK debug**: `packages/android/android/app/build/outputs/apk/debug/app-debug.apk` (9.9 MB, compilada 2026-05-27)

---

## Bugs activos y conocidos

### BUG-01 — `i.map is not a function` en pantalla Rutinas (ABIERTO)

**Síntoma**: La pantalla Rutinas crashea con `TypeError: i.map is not a function` en un `useMemo`.
**Stack trace**: `Routines-Dv23SETP.js` → `useMemo` → crash en el callback.
**Causa probable**: `routinesApi.list()` resuelve con un valor no-array en algún edge case de red o cache (no reproducible en llamadas normales al backend).
**Fixes aplicados**:
- `useRoutines.ts`: `Array.isArray(data) ? data : []` antes de llamar a `setCustomRoutines`
- `Routines.tsx` `load()`: mismo guard
- `Routines.tsx` `customs` useMemo: `(Array.isArray(customRoutines) ? customRoutines : []).map(...)`

**Estado**: Parche defensivo aplicado. Causa raíz desconocida — no reproducible en backend (siempre devuelve array). El bug puede seguir apareciendo si hay una causa distinta no identificada.

---

### BUG-02 — Config muestra "Usuario" y campos vacíos (RESUELTO)

**Síntoma**: La pantalla Configuración muestra "Usuario" en lugar del nombre real del usuario, y los campos Nombre y Correo aparecen con placeholders vacíos.
**Causa confirmada**: `useState(user?.name ?? '')` solo inicializa una vez al montar. Si el objeto `user` en localStorage viene de una sesión antigua (anterior a que el login devolviera `name` y `email`), los campos quedan vacíos.
**Fixes aplicados**:
- `App.tsx`: al arrancar con sesión autenticada, llama `GET /users/me` y actualiza el store con datos frescos del servidor. Esto corrige el localStorage stale en TODOS los dispositivos, en cada inicio de app.
- `Config.tsx`: `useEffect` para sincronizar campos de formulario cuando cambia `user` en el store.
- `auth.ts` backend: `loginUser` usa `sanitizeUser()` para devolver objeto `user` completo (incluye `plan`, `planExpiresAt`, `trialEndsAt`).

**Estado**: Fix permanente aplicado. No requiere re-login ni limpiar localStorage.

---

### BUG-03 — Barra de estado Android (status bar) solapa el contenido (RESUELTO en APK nueva)

**Síntoma**: En la APK anterior, la status bar se superponía al header "Configuración" (y todas las pantallas). Anotado con líneas rojas en los screenshots.
**Causa**: El antiguo `capacitor.config.ts` no tenía `overlaysWebView: false` — el WebView renderizaba por debajo de la status bar sin padding CSS para compensarlo.
**Fix aplicado**: `packages/android/capacitor.config.ts` — añadido `plugins.StatusBar.overlaysWebView: false`. Android reserva el espacio automáticamente.
**Verificación pendiente**: Instalar la APK nueva en el dispositivo.

```bash
adb install -r packages/android/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Sesión 2026-05-21 — Mejoras Android (lo que se hizo)

### Fase 1 — Back button + Status bar ✅

- `capacitor.config.ts`: `StatusBar.overlaysWebView: false`, `backgroundColor: '#171614'`
- `App.tsx`: `registerBackButton()` — doble toque para salir (< 2 s), `App.exitApp()`
- `App.tsx`: `updateNativeStatusBar(theme)` — sincroniza color de status bar en cada cambio de tema
- Instalados: `@capacitor/status-bar@8.0.2`

### Fase 2 — Cámara nativa ✅

- `packages/web/src/lib/camera.ts` (nuevo): `captureNativePhoto()`, `applyWatermarkToBase64()`, `isNativePlatform()`
- `Duelos.tsx` — `CheckInModal`: rama nativa vs. web. En Android abre la cámara del sistema, aplica watermark, pide confirmación.
- Instalados: `@capacitor/camera@8.2.0`

### Fase 3 — FCM push + recordatorio diario ✅

**Backend:**
- `packages/backend/src/services/fcm.ts` (nuevo): Firebase Admin SDK, `sendFcmNotification()`, `cleanInvalidFcmToken()`
- `packages/backend/prisma/schema.prisma`: campos `fcmToken String?` y `reminderTime String?` en `UserSettings`
- `routes/push.ts`: `POST /push/fcm-token` (guarda token), `DELETE /push/fcm-token`
- `routes/push.ts`: `POST /push/test` envía tanto Web Push como FCM
- `routes/users.ts`: `reminderTime` en el schema de `PUT /me/settings`
- `services/queue.ts`: job `reminder-scan` — escanea cada minuto usuarios con `reminderTime == HH:MM UTC` actual y envía FCM
- `app.ts`: registra el job repeatable al arrancar

**Frontend:**
- `packages/web/src/lib/pushNative.ts` (nuevo): inicialización de FCM en Capacitor
- `api/push.ts`: añadidos `registerFcmToken()` y `unregisterFcmToken()`
- `App.tsx`: `initNativePush()` al montar — solicita permisos, registra token FCM en backend
- `Config.tsx`: sección "Recordatorio de entrenamiento" (solo visible en APK nativa) con `<input type="time">`

**Setup Firebase (manual, ya hecho):**
- Proyecto: `gym-tracker-5b5ae`
- Package: `com.ludaisca.gymtracker`
- `google-services.json` copiado a `packages/android/android/app/`
- `FIREBASE_SERVICE_ACCOUNT` añadido a `.env` local (⚠️ nunca commitear)

### Fixes de backend ✅

- `loginUser` en `auth.ts` ahora usa `sanitizeUser()` → login devuelve objeto `user` completo igual que `GET /me`
- Instalados: `@capacitor/push-notifications@8.1.1`, `firebase-admin` (backend)

---

## Pendiente / Siguiente sesión

| Prioridad | Tarea | Notas |
|-----------|-------|-------|
| 🔴 Alta | Compilar APK nueva + instalar en dispositivo | Fix status bar requiere recompilar. `make android-dev-build` o producción |
| 🔴 Alta | Aplicar migración `20260527100000_add_lift_goals` en producción | `cd packages/backend && npx prisma migrate deploy` |
| 🔴 Alta | Actualizar routing en Coolify (apuntar Traefik a `api:3001` en lugar de `nginx:80`) | Panel Coolify → Service → Port |
| 🔴 Alta | Añadir variables SMTP + FIREBASE_SERVICE_ACCOUNT a Coolify | Panel Coolify → Environment Variables |
| 🔴 Alta | Deploy a producción | `make deploy` o botón Redeploy en Coolify |
| 🟢 Baja | Confirmar si BUG-01 (`i.map is not a function`) persiste | `adb logcat` si aparece |
| 🟢 Baja | Publicar en Google Play Store | APK debug lista; falta firma release + ficha de la tienda |

---

## Sesión 2026-05-27 — UI/UX refresh + fix status bar

### Fix crítico: status bar icons invertidos
- `App.tsx`: `Style.Dark` → iconos blancos (para fondo oscuro); `Style.Light` → iconos oscuros (para fondo claro). El código tenía los enums al revés.
- `capacitor.config.ts`: `style: 'dark'` como valor inicial (default theme es dark → necesita iconos blancos antes del primer render).

### Nuevos features (todos completos, sin commitear)
- **PlateCalcModal**: calculadora de discos para la barra. Activa manteniendo pulsado el campo kg en SetBox.
- **Stats enriquecido** — 5 nuevos tabs:
  - _Progreso_: gráfica de volumen semanal, progreso por ejercicio, tabla PRs, proyección 1RM, top volumen, sugerencias de progresión
  - _Músculos_: body heatmap SVG (`BodySvg`) con opacidad proporcional al volumen por grupo muscular
  - _Metas 1RM_: `LiftGoal` model — usuarios definen su objetivo kg por ejercicio; barra de progreso muestra % alcanzado
  - _Peso corporal_: gráfica de evolución
  - _Logros_: 10 achievements desbloqueables (sesiones, racha, volumen, notas)
- **EmptyState**: componente reutilizable para vistas sin datos
- **Dashboard**: empty state cuando no hay rutina activa; WeeklyBriefCard con AI
- **Notes**: swipe-to-delete con Framer Motion + filtros all/pending/done
- **ExerciseCard/SetBox**: swipe-to-complete en cabecera del ejercicio + haptic feedback en PR

### Backend
- `routes/goals.ts`: CRUD de `LiftGoal` — GET, POST (upsert), DELETE `/:exerciseName`
- `schema.prisma`: modelo `LiftGoal` con unique index `(userId, exerciseName)`
- Migración `20260527100000_add_lift_goals` lista — ⚠️ aplicar en producción

---

## Sesión 2026-05-26 — Refactorización Android-only + Live Reload

### Eliminado (código web-only)
- PWA: `vite-plugin-pwa`, service worker, `ReloadPrompt`, `push-handler.js`, meta tags Apple
- Web Push (VAPID): `services/vapid.ts`, `use-cases/push.ts`, endpoints `/push/subscribe`, `/push/unsubscribe`, `/push/vapid-public-key`, `PushRepository`, `web-push` npm package
- Rama `getUserMedia` en Duelos.tsx (cámara web); guard `isNativePlatform()` en todos los archivos — ahora siempre es Android
- Sección "Notificaciones Push" en Config.tsx

### Añadido
- **Capacitor Live Reload** (`packages/android/capacitor.config.ts`): bloque `server` condicional activado con `LIVE_RELOAD_IP=<ip> npx cap sync android`
- **`make android-dev-build`**: compila APK con live reload (detecta IP Tailscale/LAN automáticamente) e instala en dispositivo. Solo necesita ejecutarse UNA VEZ; después `make dev` da HMR instantáneo.
- `network_security_config.xml`: cleartext permitido globalmente (debug APK)

### Infraestructura simplificada
- Eliminado contenedor `nginx` de Docker Compose
- Eliminados `Dockerfile.nginx` y `nginx/nginx.conf`
- Traefik de Coolify debe apuntar ahora a `api:3001` directamente

---

## Comandos de desarrollo

```bash
# Desarrollo local
make db-up                  # PostgreSQL :5440 + Redis :6390
make dev                    # Vite :5173 + backend :3010

# Android — Live Reload (primera vez o al cambiar plugins nativos)
make android-dev-build      # detecta IP, compila APK con live reload, instala en USB
# Después solo: make dev → abrir app en el teléfono → HMR instantáneo

# Android — Producción (APK con assets bundleados y API de producción)
make android-build          # vite build --mode android + cap sync
JAVA_HOME=~/java/jdk-21.0.7+6 ANDROID_HOME=~/android-sdk \
  ./packages/android/android/gradlew assembleDebug

# DB
make db-migrate             # prisma migrate dev (TTY requerido)
make db-studio              # Prisma Studio

# Producción
make deploy                 # git pull + rebuild + up
```

---

## Variables de entorno nuevas (esta sesión)

| Variable | Descripción | Dónde configurar |
|----------|-------------|-----------------|
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo de la service account de Firebase | `.env` local + Coolify prod |
| `SMTP_HOST` | `mail.ludaisca.com` | `.env` local + Coolify prod |
| `SMTP_PORT` | `465` | `.env` local + Coolify prod |
| `SMTP_SECURE` | `true` | `.env` local + Coolify prod |
| `SMTP_USER` | `test@ludaisca.com` | `.env` local + Coolify prod |
| `SMTP_PASS` | contraseña del buzón | `.env` local + Coolify prod |
| `SMTP_FROM` | `Gym Tracker <test@ludaisca.com>` | `.env` local + Coolify prod |

**Nota**: Las claves privadas están en `.env` (gitignoreado). Nunca exponerlas en código ni commits.

---

## Sesión 2026-05-26 — SMTP + fixes

### SMTP configurado
- Servidor propio: `mail.ludaisca.com:465` (SSL)
- Remitente: `test@ludaisca.com`
- `APP_URL` en dev apunta a `http://100.113.48.59:5173` (Tailscale) para que links funcionen en el teléfono

### Bug fix: bucle de login al aceptar notificaciones
- **Causa**: `initNativePush` registraba el token FCM sin verificar si había sesión activa
- **Fix**: guard `isAuthenticated` en `App.tsx` antes de llamar `pushApi.registerFcmToken`
- **También**: `updateNativeStatusBar` envuelto en `try/catch`

### Limpieza
- Eliminadas imágenes WhatsApp y carpeta `Errores Detectados/` (basura)
- `AGENTS.md` actualizado (removidas referencias a nginx e `isNativePlatform`)
- `coolify.env` actualizado con SMTP; añadido a `.gitignore`
