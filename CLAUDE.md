# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Arquitectura general

El proyecto tiene dos versiones coexistentes:

- **`gym-tracker.html`** — SPA monolítica legacy (~2278 líneas, CSS+HTML+JS inline). Sigue siendo el archivo de referencia de lógica de negocio.
- **`frontend/` + `backend/`** — Rewrite full-stack activo: React 19 + Fastify + PostgreSQL. Es la versión hacia donde evoluciona el producto.

El docker-compose orquesta cuatro servicios: `nginx` → `web` (dist del frontend) → `api` (Fastify :3001) → `db` (Postgres :5432). Nginx hace reverse proxy de `/api/*` al backend y sirve el SPA para todo lo demás.

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
- `auth` — registro, login, refresh, logout
- `users` — perfil, settings, avatar/theme
- `sessions` — sesiones de entrenamiento (CRUD)
- `routines` — rutinas custom del usuario
- `notes` — notas globales
- `nutrition` — días de nutrición + alimentos guardados
- `ai` — dos endpoints: `POST /ai/analyze` (análisis de progreso de entrenamiento con prompt contextualizado) y `POST /ai/analyze-food` (análisis nutricional de fotos vía vision API)
- `migrate` — importa datos del formato v3 del HTML legacy

**Plugins** (`backend/src/plugins/`): `prismaPlugin` añade `fastify.prisma`; `authPlugin` añade `fastify.authenticate` (JWT verify) y decora `request.user`. El middleware de auth (`backend/src/middleware/auth.ts`) es el helper que usan las rutas protegidas para llamar a `fastify.authenticate`.

**Validación**: Las rutas usan Zod para validar el body de las requests antes de llegar a Prisma.

**Auth**: JWT de corta vida (access token) + refresh token persistido en DB (`RefreshToken`). El cliente guarda el refresh token en `localStorage` bajo `gym-refresh-token`.

**Variables de entorno requeridas**: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT` (default 3001).

**IA (vision + texto)**: Las rutas `/ai/*` leen `UserSettings.aiProvider` / `aiKey` / `aiModel` por usuario para hacer proxy a Google Gemini, OpenAI o Anthropic. Soportan los tres proveedores; el modelo por defecto varía según proveedor (e.g. `gemini-2.5-flash-lite`, `gpt-4o-mini`, `claude-haiku-4-5-20251001`). El endpoint de foto requiere `imageBase64` + `mimeType`.

---

## Frontend — React 19 + Zustand

**Routing**: React Router v7, definido en `App.tsx`. Todas las rutas autenticadas están bajo `AppShell` protegidas por `AuthGuard`.

**Vistas principales**: `Dashboard`, `Agenda`, `DayView` (`/entrenamiento/:dayId`), `Stats`, `Insights`, `Routines`, `RoutineEditor`, `Cardio`, `Notes`, `Nutrition`, `Config`.

**Estado global** (`frontend/src/store/index.ts`):
- `useAuthStore` — usuario autenticado + access token (persiste en `localStorage` bajo `gym-auth`)
- `useUIStore` — tema light/dark + accentTheme (persiste bajo `gym-ui`). **Es la única fuente de verdad del tema**; nunca leer/escribir `data-theme` directamente al DOM desde fuera del store.
- `useOfflineStore` — cola de acciones pendientes para sync cuando se recupere conexión

**Sistema de temas**: el `<html>` lleva dos atributos: `data-theme` (light/dark) y `data-accent` (teal/forest/ocean/ember/violet). Ambos se aplican desde `useUIStore` via CSS custom properties en `globals.css`. Al añadir un nuevo accent, registrar los bloques CSS en `globals.css` **y** la entrada en el array `ACCENT_THEMES` de `Config.tsx`.

**Cliente HTTP** (`frontend/src/api/client.ts`): Axios con interceptors que:
1. Añaden `Authorization: Bearer <token>` a cada request.
2. En 401, intentan refresh automático antes de redirigir a `/login`.
3. En offline, encolan las mutaciones en `useOfflineStore` para reintento posterior.

**Capa de API** (`frontend/src/api/`): Módulos por dominio (`auth`, `sessions`, `routines`, `notes`, `nutrition`, `users`, `ai`) que envuelven el cliente Axios. Toda llamada al backend pasa por aquí, nunca directamente desde los componentes.

**Sync offline**: `useOfflineSync` hook — al volver a estar online, drena la cola en orden y hace los requests pendientes.

**PWA**: La app es instalable como PWA (vite-plugin-pwa + Workbox). API calls usan estrategia `NetworkFirst` con caché de 24 h y timeout de 5 s. El service worker se auto-actualiza. `devOptions.enabled = false` — el SW no corre en `make dev`, solo en producción.

**Utilidades de fitness** (`frontend/src/lib/fitness.ts`): Centraliza todo el cálculo de dominio: `calc1RM`, `calcWeekVolume`, `isPR`, `calcStreak`, `getBestKgForWeek`, `getRoutineDays`, `getDayIds`, `getTodayDayId`. No duplicar esta lógica en componentes.

**Tipos compartidos** (`frontend/src/types/domain.ts`): Interfaces TypeScript para todas las entidades (`User`, `WorkoutSession`, `Routine`, `NutritionDay`, `GlobalNote`, `SavedFood`, `UserSettings`, `AuthResponse`). Usar estas interfaces, no inventar tipos locales. `UserSettings` incluye `aiProvider`, `aiModel`, `aiKeySet` (boolean — la key nunca se expone al cliente).

---

## Esquema de datos (Prisma / PostgreSQL)

Modelos principales: `User`, `UserSettings` (1:1), `Routine`, `WorkoutSession`, `NutritionDay`, `GlobalNote`, `SavedFood`, `RefreshToken`.

`UserSettings` contiene: preferencias de nutrición (`dailyKcal`, `dailyProtein`, etc.), tema (`accentTheme`), objetivo (`goal`), y credenciales de IA (`aiProvider`, `aiKey`, `aiModel`). La `aiKey` se almacena en texto plano en DB pero **nunca se devuelve al cliente** — solo se expone `aiKeySet: boolean`.

Clave de unicidad en sesiones: `(userId, weekNumber, dayId)` — igual que la clave `week-${week}-${dayId}` del HTML legacy.

`Routine.days` es `Json` — mismo formato que `PRESET_ROUTINES` del legacy: array de días con sus ejercicios `{ name, reps, rest, sets }`.

---

## HTML monolítico — patrones críticos (solo al editar gym-tracker.html)

- **`render()`** es el único punto de entrada para actualizar la UI; siempre terminar con `saveState()` + `render()`.
- **Proxy getters**: usar `getWeek()`, `getSessions()`, `getSettings()`, `getGlobalNotes()` — nunca leer `state.week` directo.
- **`ensureSession(day)`**: siempre usar esta función para acceder/crear una sesión; nunca `getSessions()[key]` para escritura.
- Estado persiste bajo clave `gymtracker_v3` en localStorage; `loadState()` migra desde `gymtracker_v2`.
- Event handlers usan funciones globales (`onclick="fn()"`) porque el JS está en scope global.
- CSS usa custom properties con dos temas: `[data-theme="light"]` y `[data-theme="dark"]`.
