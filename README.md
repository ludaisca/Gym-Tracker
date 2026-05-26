# Gym Tracker

Aplicación de seguimiento de entrenamiento y nutrición para Android. Construida con React 19 + Capacitor 8, con API Fastify en producción (Coolify).

**Producción**: `https://gym-tracker.ludaisca.ddns.net`  
**Rama activa**: `v1`

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Fastify v5 · Prisma · PostgreSQL · Redis · BullMQ |
| Frontend (APK) | React 19 · Vite 8 · Zustand · Axios · Capacitor 8 |
| Infra | Docker Compose · Coolify + Traefik (producción) |

La app corre en un WebView de Android gestionado por Capacitor. No hay app web — el único cliente es la APK.

---

## Monorepo

```
packages/
├── backend/    → API Fastify v5 + Prisma + PostgreSQL + Redis
├── web/        → Código React (UI de la APK; también sirve como dev server con HMR)
└── android/    → Wrapper Capacitor 8 + proyecto nativo Android
```

---

## Desarrollo local

### Requisitos

- Node.js 20+
- Docker y Docker Compose
- Java 21 en `~/java/jdk-21.0.7+6` (Temurin — para builds Android)
- Android SDK en `~/android-sdk` (API 36)

### Variables de entorno

```bash
cp .env.example .env   # editar con tus valores
```

Variables mínimas requeridas:

```env
DATABASE_URL=postgresql://gymtracker:pass@localhost:5440/gymtracker
REDIS_URL=redis://:pass@localhost:6390
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
ENCRYPTION_KEY=<exactamente 32 chars>
DB_USER=gymtracker
DB_PASSWORD=pass
DB_NAME=gymtracker
REDIS_PASSWORD=pass
```

### Levantar el entorno

```bash
npm install          # instala todos los workspaces
make db-up           # PostgreSQL :5440 + Redis :6390 en Docker
make db-migrate      # migraciones Prisma (requiere TTY)
make dev             # Vite :5173 + backend :3010 en paralelo
```

---

## Desarrollo Android con Live Reload

Compila la APK **una sola vez** con la IP del servidor de desarrollo. Después cualquier cambio en el código React aparece al instante en el teléfono (HMR) sin recompilar.

```bash
# Teléfono conectado por USB + make dev corriendo
make android-dev-build   # detecta IP (Tailscale > LAN), compila APK e instala
make dev                 # arranca Vite :5173 + backend :3010
# Abrir la app en el teléfono → carga desde http://<ip>:5173
```

Para forzar una IP específica:

```bash
make android-dev-build DEV_IP=100.x.x.x
```

Recompilar la APK solo cuando cambien plugins nativos (Capacitor, Firebase, cámara...).

---

## Build de producción (APK)

```bash
make android-build   # vite build --mode android + cap sync
# Luego compilar con Gradle:
cd packages/android/android
JAVA_HOME=~/java/jdk-21.0.7+6 ANDROID_HOME=~/android-sdk ./gradlew assembleDebug
# APK → app/build/outputs/apk/debug/app-debug.apk
```

---

## Producción con Docker Compose

```bash
make up              # levantar contenedores (api, db, redis, db-backup)
make down            # parar todo
make build           # rebuild sin caché
make deploy          # git pull + rebuild + up
make logs            # logs en vivo de la API
make restart         # reiniciar api
make backup          # dump PostgreSQL → ./backups/
```

---

## Despliegue en Coolify

1. Crear proyecto en Coolify apuntando a este repositorio, rama `v1`
2. Seleccionar `docker-compose.yml` (Coolify ignora el `.override.yml`)
3. Configurar variables de entorno en el panel (ver tabla en `CLAUDE.md`)
4. **Routing**: Traefik de Coolify debe apuntar a `api:3001` (ya no hay nginx)
5. El origen `capacitor://localhost` está en la lista CORS del backend — no requiere configuración adicional

---

## Base de datos

```bash
make db-migrate                              # aplicar migraciones en dev
make db-studio                               # Prisma Studio en el navegador
# Producción:
npx prisma migrate deploy                    # dentro del contenedor api (lo hace automáticamente el entrypoint)
```

---

## Push notifications (FCM)

Setup Firebase:
1. Proyecto Firebase: `gym-tracker-5b5ae` | Package: `com.ludaisca.gymtracker`
2. `google-services.json` → `packages/android/android/app/` (gitignoreado)
3. `FIREBASE_SERVICE_ACCOUNT` → variable de entorno en Coolify (JSON completo en una línea)

---

## Funcionalidades

- **Entrenamientos** — Sesiones por semana/día, autofill del anterior, sets con kg/reps, cardio, timer
- **Rutinas** — Presets estándar + custom + compartir con link
- **Nutrición** — Comidas y macros por día, análisis de fotos con IA, agua, promedio semanal
- **IA** — Análisis de progreso, recomendaciones, chat contextual (OpenAI / Anthropic / Google)
- **Peso corporal** — Historial + gráfica de tendencia
- **Duelos** — Challenges con check-ins fotográficos nativos y ranking
- **Analytics** — Volumen semanal, PRs, proyecciones de 1RM
- **Push notifications** — Recordatorios FCM con hora configurable
- **Offline-first** — Cola de escrituras que se reproduce al reconectar
- **Temas** — Claro/oscuro + 5 colores de acento
- **Export/Import** — Backup completo en JSON

---

## API Reference

| Ruta | Descripción |
|------|-------------|
| `POST /auth/register` | Crear cuenta |
| `POST /auth/login` | Iniciar sesión |
| `POST /auth/refresh` | Renovar access token |
| `GET/PUT /users/me` | Perfil de usuario |
| `GET/PUT /users/me/settings` | Configuración + recordatorio FCM |
| `GET/PUT /sessions/:week/:day` | Sesión de entrenamiento |
| `CRUD /routines` | Rutinas custom |
| `CRUD /nutrition/:date` | Días de nutrición |
| `CRUD /notes` | Notas |
| `POST /ai/analyze` | Análisis de progreso con IA |
| `POST /ai/chat` | Chat contextual con IA |
| `CRUD /challenges` | Duelos |
| `POST /push/fcm-token` | Registrar token FCM |
| `POST /push/test` | Notificación de prueba |

Panel de colas (BullMQ): `GET /admin/queues` con `Authorization: <ADMIN_TOKEN>`
