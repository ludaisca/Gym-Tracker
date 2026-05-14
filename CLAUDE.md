# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Arquitectura general

El proyecto tiene dos versiones coexistentes:

- **`gym-tracker.html`** — SPA monolítica legacy (~2278 líneas, CSS+HTML+JS inline). Sigue siendo el archivo de referencia de lógica de negocio.
- **`frontend/` + `backend/`** — Rewrite full-stack activo: React 19 + Fastify + PostgreSQL. Es la versión hacia donde evoluciona el producto.

El docker-compose orquesta tres servicios: `nginx` → `api` (Fastify :3001) → `db` (Postgres :5432). Nginx hace reverse proxy de `/api/*` al backend y sirve el SPA para todo lo demás. **La BD no expone puertos al host en producción** — solo es accesible internamente en la red Docker.

---

## Comandos de desarrollo

### Full-stack (nueva versión)

```bash
# Prerequisito: BD levantada
make db-up          # Postgres en Docker, puerto 5432

# Desarrollo con hot-reload (Vite + tsx watch en paralelo)
cp .env.example .env   # una sola vez
make dev               # lanza frontend (Vite) + backend (tsx watch)

# Migraciones
make db-migrate        # prisma migrate dev
make db-studio         # Prisma Studio en el browser
```

El frontend corre en `http://localhost:5173` y hace proxy de `/api` al backend en `:3001` (configurado en `vite.config.ts`).

### Producción (Docker)

```bash
make build    # construye imágenes y levanta todos los servicios
make deploy   # git pull + rebuild + up
make logs     # nginx + api en tiempo real
```

### Lint y tipado

```bash
cd frontend && npm run lint   # ESLint sobre todo el src/
cd frontend && npx tsc -b     # chequeo de tipos sin emitir
cd backend  && npx tsc        # chequeo de tipos del backend
```

### HTML monolítico (legacy)

```bash
# Validar sintaxis JS después de editar el bloque <script>
node -e "const h=require('fs').readFileSync('gym-tracker.html','utf8');const s=h.match(/<script>([\s\S]*?)<\/script>/)[1];try{new Function(s);console.log('✓ OK')}catch(e){console.log('❌',e.message)}"

# Servir con fetch() funcional
python3 -m http.server 8080
```

---

## Backend — Fastify + Prisma

**Punto de entrada**: `backend/src/server.ts` → `buildApp()` en `app.ts`.

**Rutas** (`backend/src/routes/`, todas prefijadas con `/api` vía nginx):
- `auth` — registro, login, refresh, logout, verificación de email, forgot/reset password
- `users` — perfil, settings, avatar, export/import completo de datos
- `sessions` — sesiones de entrenamiento (CRUD)
- `routines` — rutinas custom del usuario
- `notes` — notas globales
- `nutrition` — días de nutrición + alimentos guardados
- `ai` — `POST /ai/analyze` (análisis de progreso) y `POST /ai/analyze-food` (análisis nutricional por foto)
- `challenges` — retos entre usuarios
- `migrate` — importa datos del formato v3 del HTML legacy

**Plugins** (`backend/src/plugins/`): `prismaPlugin` añade `fastify.prisma`; `authPlugin` añade `fastify.authenticate` (JWT verify) y decora `request.user`.

**`request.user`**: `{ sub: string, email: string }` — `sub` es el `userId` (string UUID).

**Validación**: Zod en todas las rutas. Errores: `body.error.issues[0].message`.

**Auth**: Access token caduca en **15 min**; refresh token caduca en **30 días** y se persiste en DB (`RefreshToken`). El cliente guarda el refresh token en `localStorage` bajo `gym-refresh-token`.

**Seguridad**: Helmet globalmente. CORS `origin: true` en dev, `origin: false` en producción. Body limit 5 MB (para imágenes base64). Rate limiting global 200 req/min; rutas sensibles con límites propios (registro: 5/hora, login: 10/15 min).

**Email** (`backend/src/services/email.ts`): Nodemailer con configuración SMTP por variables de entorno. Sin `SMTP_HOST` los correos se imprimen en logs (modo dev silencioso). `APP_URL` construye los links de verificación y reset en los correos.

**Seguridad de datos**: `sanitizeUser()` en `users.ts` elimina `passwordHash` de cualquier respuesta. `aiKey` nunca se devuelve al cliente — solo se expone `aiKeySet: boolean`. El export (`GET /me/export`) excluye `passwordHash`, `verificationToken`, `resetToken` y sus expiries.

**IA**: Las rutas `/ai/*` leen `UserSettings.aiProvider` / `aiKey` / `aiModel` por usuario. Soportan Google Gemini, OpenAI y Anthropic. Las claves van en DB por usuario, **no en variables de entorno del servidor**.

**Health check**: `GET /health` — sin auth, devuelve `{ status: 'ok' }`.

**Variables de entorno requeridas**: `DATABASE_URL`, `JWT_SECRET`. Opcionales: `JWT_REFRESH_SECRET`, `PORT` (default 3001), `NODE_ENV`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_URL`.

---

## Frontend — React 19 + Zustand

**Routing**: React Router v7, definido en `App.tsx`. Rutas públicas: `/login`, `/register`, `/verificar-email`, `/olvide-contrasena`, `/restablecer-contrasena`. Rutas autenticadas bajo `AppShell` protegidas por `AuthGuard`.

**Vistas principales** (todas bajo `frontend/src/components/views/`):
- `Dashboard` — KPIs de la semana actual + heatmap de actividad (usa `sessionsApi.listAll()` para streak e heatmap)
- `Agenda` — vista semanal de días con estado visual (`.status-done` / `.status-partial`)
- `DayView` (`/entrenamiento/:dayId`) — sesión de entrenamiento activa
- `Stats` — estadísticas históricas y logros (usa `sessionsApi.listAll()` + `useRoutines()`)
- `Insights` — chat IA con análisis de progreso
- `Routines` / `RoutineEditor` — gestión de rutinas
- `Cardio` — registro y gráfico de tendencia (Recharts AreaChart, usa `sessionsApi.listAll()`)
- `SessionHistory` (`/historial`) — historial completo agrupado por semana, expandible
- `Notes`, `Nutrition`, `Config`, `Duelos`

**Estado global** (`frontend/src/store/index.ts`):
- `useAuthStore` — usuario autenticado + access token (persiste en `localStorage` bajo `gym-auth`)
- `useUIStore` — tema light/dark + accentTheme (persiste bajo `gym-ui`). **Única fuente de verdad del tema**; nunca escribir `data-theme` al DOM desde fuera del store.
- `useOfflineStore` — cola de acciones pendientes para sync cuando se recupere conexión

**Hooks** (`frontend/src/hooks/`):
- `useRoutines()` — carga rutinas custom del usuario. **Siempre pasar este hook a `getRoutineDays`/`getDayIds`**; nunca pasar `[]` como customRoutines o las rutinas personalizadas no funcionarán.
- `useSessions(weekNumber)` — sesiones de la semana actual con optimistic updates y debounce de 800ms. Solo para la semana en curso.
- `useEnsuredSession(weekNumber, dayId, customRoutines)` — para `DayView`; crea sesión vacía si no existe.
- `useOfflineSync()` — drena la cola al volver online.
- `useUser()` — sincroniza usuario desde el servidor al montar.

**Patrón crítico — datos históricos vs. semana actual**:
- Para KPIs de la semana actual: `useSessions(weekNumber)`
- Para estadísticas históricas (streak, heatmap, gráficos, logros, PRs): `sessionsApi.listAll()` directamente con `useState` + `useEffect`
- Mezclar ambos en el mismo componente es correcto (Dashboard lo hace)

**Sistema de temas**: `<html>` lleva `data-theme` (light/dark) y `data-accent` (teal/forest/ocean/ember/violet). Al añadir un nuevo accent, registrar en `globals.css` **y** en el array `ACCENT_THEMES` de `Config.tsx`.

**Cliente HTTP** (`frontend/src/api/client.ts`): Axios con interceptors que añaden `Authorization: Bearer`, intentan refresh automático en 401, y encolan mutaciones en offline.

**Capa de API** (`frontend/src/api/`): Módulos por dominio. Toda llamada al backend pasa por aquí. Export/import completo: `usersApi.exportData()` / `usersApi.importData(payload)`.

**Toast** (`frontend/src/lib/toast.ts`): Pub-sub con estado módulo-nivel. Usar `toast('mensaje')` o `toast('mensaje', 'error')`. No usar `alert()`.

**Compresión de avatar**: Canvas en `Config.tsx`, máx 256px, JPEG 0.82. No subir imágenes sin comprimir.

**Logros**: Fechas de desbloqueo persisten en `localStorage` bajo `gym_achievements_${userId}`. No en backend.

**PWA**: vite-plugin-pwa + Workbox. API calls: `NetworkFirst` con caché 24h y timeout 5s. El SW no corre en `make dev`.

**Utilidades de fitness** (`frontend/src/lib/fitness.ts`): `calc1RM`, `calcWeekVolume`, `isPR`, `calcStreak`, `getBestKgForWeek`, `getRoutineDays`, `getDayIds`, `getTodayDayId`, `getLastRecordedSets`. No duplicar esta lógica en componentes. `isPR` solo cuenta ejercicios con `ex.done === true`.

**Tipos compartidos** (`frontend/src/types/domain.ts`): `User`, `WorkoutSession`, `ExerciseSession`, `CardioData`, `Routine`, `DayDef`, `ExerciseDef`, `NutritionDay`, `GlobalNote`, `SavedFood`, `UserSettings`, `AuthResponse`. No inventar tipos locales.

---

## Esquema de datos (Prisma / PostgreSQL)

Modelos: `User`, `UserSettings` (1:1), `Routine`, `WorkoutSession`, `NutritionDay`, `GlobalNote`, `SavedFood`, `RefreshToken`, `BodyWeight`, `AIChat`, `Challenge`, `CheckIn`.

`UserSettings`: preferencias de nutrición, tema, objetivo, credenciales IA. `aiKey` en texto plano en DB pero **nunca al cliente**.

Campos JSON:
- `WorkoutSession.exercises` — array de `ExerciseSession`; `WorkoutSession.cardio` — `CardioData`
- `NutritionDay.meals` — Record<MealType, FoodEntry[]>
- `Routine.days` — Record<string, DayDef>

Unicidad compuesta:
- Sesiones: `(userId, weekNumber, dayId)`
- Nutrición y peso corporal: `(userId, date)`

Cascada: todos los registros relacionados se eliminan al borrar `User`.

---

## Export / Import de datos

**Formato** (`GET /api/users/me/export`):
```json
{
  "version": 4,
  "exportedAt": "ISO date",
  "data": {
    "name", "email", "avatar", "currentWeek", "activeRoutineId",
    "settings": { ...UserSettings },
    "customRoutines": [...],
    "sessions": [...],
    "nutritionDays": [...],
    "bodyWeights": [...],
    "notes": [...],
    "savedFoods": [...]
  }
}
```

**Import** (`POST /api/users/me/import`): upsert por clave única para sesiones (`weekNumber+dayId`), nutritionDays (`date`), bodyWeights (`date`); create+catch para notas y savedFoods. Los settings sobreescriben los 8 campos de nutrición y configuración pero no las claves IA.

---

## HTML monolítico — patrones críticos (solo al editar gym-tracker.html)

- **`render()`** es el único punto de entrada para actualizar la UI; siempre terminar con `saveState()` + `render()`.
- **Proxy getters**: usar `getWeek()`, `getSessions()`, `getSettings()`, `getGlobalNotes()` — nunca leer `state.week` directo.
- **`ensureSession(day)`**: siempre para acceder/crear una sesión; nunca `getSessions()[key]` para escritura.
- Estado persiste bajo clave `gymtracker_v3` en localStorage; `loadState()` migra desde `gymtracker_v2`.
- Event handlers usan funciones globales (`onclick="fn()"`) porque el JS está en scope global.
