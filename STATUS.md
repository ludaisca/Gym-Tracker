# STATUS.md — Gym Tracker v1

> Estado técnico real del proyecto. Documento vivo actualizado a 2026-05-21.
> Sustituye a PLAN.md.

---

## Estado general

**Rama activa**: `v1` | **Producción**: Coolify en `gym-tracker.ludaisca.ddns.net`
**APK debug**: `packages/android/android/app/build/outputs/apk/debug/app-debug.apk` (10 MB, compilada 2026-05-21)

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
| 🔴 Alta | Instalar APK nueva en dispositivo y verificar BUG-01, BUG-02, BUG-03 | `adb install -r ...app-debug.apk` |
| 🔴 Alta | Confirmar si `i.map` persiste tras el parche o tiene otra causa | Revisar logs del dispositivo con `adb logcat` si sigue fallando |
| 🟡 Media | Migrar DB prod con nuevos campos `fcmToken` + `reminderTime` | `prisma migrate deploy` en Coolify |
| 🟡 Media | Añadir `FIREBASE_SERVICE_ACCOUNT` a variables de entorno en Coolify | Panel Coolify → Environment Variables |
| 🟢 Baja | Publicar en Google Play Store | APK debug lista; falta firma release + ficha de la tienda |
| 🟢 Baja | Integración Stripe real en producción | Actualmente todo-gratis; backend listo |

---

## Comandos de desarrollo

```bash
# Desarrollo local
make db-up           # PostgreSQL :5440 + Redis :6390
make dev             # Vite :5173 + backend :3010

# Android
make android-build   # vite build --mode android + cap sync
JAVA_HOME=~/java/jdk-21.0.7+6 ANDROID_HOME=~/android-sdk \
  ./packages/android/android/gradlew assembleDebug
adb install -r packages/android/android/app/build/outputs/apk/debug/app-debug.apk

# DB
make db-migrate      # prisma migrate dev (TTY requerido)
make db-studio       # Prisma Studio

# Producción
make deploy          # git pull + rebuild + up
```

---

## Variables de entorno nuevas (esta sesión)

| Variable | Descripción | Dónde configurar |
|----------|-------------|-----------------|
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo de la service account de Firebase | `.env` local + Coolify prod |

**Nota**: La clave privada de Firebase está en `.env` (gitignoreado). Nunca exponerla en código ni commits.
