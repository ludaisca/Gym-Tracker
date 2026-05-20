# Gym Tracker

Aplicación de seguimiento de entrenamiento y nutrición. PWA mobile-first con soporte offline, IA integrada, sistema de monetización Pro y generación de APK nativa para Android.

**Estado actual**: v1 rama activa. Producción lista en Coolify. Mayoría de features y correcciones implementadas (ver PLAN.md).

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Fastify v5 · Prisma · PostgreSQL · Redis · BullMQ |
| Frontend | React 19 · Vite 8 · Zustand · Axios · PWA (vite-plugin-pwa) |
| Mobile | Capacitor 8 (APK nativa desde el mismo código web) |
| Infra | Docker Compose · nginx reverse proxy · Coolify (producción) |

## Estructura del monorepo

```
v1/
├── packages/
│   ├── backend/          # API Fastify
│   │   ├── src/
│   │   │   ├── app.ts         # Plugins y rutas de Fastify
│   │   │   ├── routes/        # Un archivo por dominio
│   │   │   ├── plugins/       # prisma, redis, auth
│   │   │   └── services/      # queue (BullMQ), email, importTask
│   │   └── prisma/
│   │       └── schema.prisma
│   ├── web/              # PWA React
│   │   └── src/
│   │       ├── api/           # Axios + interceptores
│   │       ├── store/         # Zustand (auth, UI, offline)
│   │       ├── hooks/         # useOfflineSync, useSessions, etc.
│   │       ├── components/
│   │       │   ├── layout/    # AppShell, bottom nav
│   │       │   ├── views/     # Una vista por pantalla
│   │       │   └── ui/        # Iconos, toasts
│   │       └── styles/        # globals.css (design tokens)
│   └── android/          # Wrapper Capacitor (sin código React)
│       └── capacitor.config.ts
├── docker-compose.yml
├── docker-compose.override.yml   # Bind :80 solo en dev local
├── Dockerfile.backend
├── Dockerfile.nginx
├── nginx/nginx.conf
└── Makefile
```

## Funcionalidades

### Core
- **Entrenamientos** — Sesiones por semana/día, autofill del entrenamiento anterior, múltiples sets con kg y reps, cardio, timer integrado
- **Rutinas** — Presets estándar (Bro Split, Push Pull Legs, Full Body…) + rutinas custom + compartir con link
- **Nutrición** — Registro de comidas y macros por día, análisis de fotos con IA, tracking de agua, promedio semanal
- **IA** — Análisis de progreso, recomendaciones de entrenamiento, chat contextual (OpenAI / Anthropic / Google)
- **Peso corporal** — Historial + gráfica de tendencia

### Premium (Pro)
- **Duelos** — Challenges entre usuarios con check-ins fotográficos y ranking
- **Analytics avanzado** — Volumen por semana, PRs, proyecciones de 1RM
- **Marketplace** — Publicar y clonar rutinas de la comunidad
- **Push notifications** — Recordatorios de entrenamientos
- **Progresión automática** — Sugiere +2.5 kg cuando reps consistentes

### Todos
- **Offline-first** — Cola de escrituras pendientes que se reproduce al reconectar
- **Temas** — Modo claro/oscuro + 5 colores de acento (teal, verde, azul, naranja, violeta)
- **Export/Import** — Backup completo en JSON
- **Trial Pro** — 7 días gratis (una vez por usuario)

## Requisitos previos

- Node.js 20+
- Docker y Docker Compose
- Java 21 (solo para builds Android — ⚠️ sistema con Java 25 requiere path alternativo `~/java/jdk-21.0.11+10`)

## Desarrollo local

### 1. Variables de entorno

```bash
cp .env.example .env   # editar con tus valores
```

Variables requeridas:

```env
DATABASE_URL=postgresql://gymtracker:gymtracker@localhost:5432/gymtracker
REDIS_URL=redis://localhost:6379
JWT_SECRET=<mínimo 32 chars aleatorios>
JWT_REFRESH_SECRET=<mínimo 32 chars aleatorios>
ENCRYPTION_KEY=<exactamente 32 chars — cifra las API keys de IA>

# Opcionales
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
ADMIN_TOKEN=<token para Bull Board>
```

### 2. Instalar dependencias

```bash
npm install          # instala todos los workspaces
```

### 3. Levantar servicios y migrar la base de datos

```bash
make db-up           # PostgreSQL + Redis en Docker
make db-migrate      # ejecuta migraciones Prisma
```

### 4. Arrancar el servidor de desarrollo

```bash
make dev             # frontend :5173 + backend :3001 en paralelo
```

Comandos individuales:

```bash
cd packages/backend && npm run dev    # tsx watch
cd packages/web && npm run dev        # Vite dev server
```

## Producción con Docker Compose

```bash
make build           # rebuild completo sin caché
make up              # levantar todos los contenedores
make logs            # logs en vivo de nginx y api
make restart         # reiniciar api y nginx (sin tocar BD)
make down            # parar todo
make backup          # dump de PostgreSQL → ./backups/
```

El archivo `docker-compose.override.yml` añade `ports: ["80:80"]` para dev local. En producción (Coolify) no se carga y Traefik enruta el tráfico.

## Android (APK)

El paquete `packages/android/` es solo el wrapper de Capacitor. Todo el código React vive en `packages/web/`.

```bash
make android-build   # build web con --mode android + cap sync
make android-open    # abre en Android Studio
make android-run     # instala en dispositivo USB
```

Para generar el APK firmado:

```bash
cd packages/android
JAVA_HOME=~/java/jdk-21.0.11+10 ./android/gradlew assembleDebug
# APK → android/app/build/outputs/apk/debug/app-debug.apk
```

La variable `VITE_API_URL` del archivo `packages/android/.env` apunta a la API de producción para la APK.

## Migraciones de base de datos

```bash
make db-migrate                        # aplicar migraciones existentes
cd packages/backend && npx prisma migrate dev --name nombre   # crear nueva migración
make db-studio                         # Prisma Studio en el navegador
```

## API Reference

| Prefijo | Descripción |
|---------|-------------|
| `POST /api/auth/register` | Crear cuenta |
| `POST /api/auth/login` | Iniciar sesión |
| `POST /api/auth/refresh` | Renovar access token |
| `POST /api/auth/logout` | Invalidar tokens |
| `GET/PUT /api/users/me` | Perfil de usuario |
| `GET/PUT /api/users/me/settings` | Configuración |
| `GET/PUT /api/sessions/:week/:day` | Sesión de entrenamiento |
| `CRUD /api/routines` | Rutinas custom |
| `CRUD /api/nutrition/:date` | Días de nutrición |
| `CRUD /api/notes` | Notas globales |
| `POST /api/ai/analyze-food` | Análisis de foto con IA |
| `POST /api/ai/analyze` | Análisis de progreso con IA |
| `POST /api/ai/chat` | Chat contextual con IA |
| `CRUD /api/challenges` | Duelos |
| `POST /api/migrate/localstorage` | Importar datos legacy |

Panel de colas (Bull Board): `GET /admin/queues` con header `Authorization: <ADMIN_TOKEN>`

## Autenticación

- **Access token** JWT de 15 min (solo en memoria, no persiste)
- **Refresh token** de 30 días en `localStorage`, guardado también en PostgreSQL + lista negra en Redis
- Al recargar la app, el interceptor de Axios renueva automáticamente el access token usando el refresh token
- Un singleton `refreshPromise` serializa múltiples peticiones 401 simultáneas para evitar refresh loops

## Despliegue en Coolify

1. Crear proyecto en Coolify apuntando a este repositorio
2. Seleccionar `docker-compose.yml` como archivo de compose (no carga el `.override.yml`)
3. Configurar las variables de entorno en el panel de Coolify
4. Traefik de Coolify enruta el dominio al contenedor nginx automáticamente

El dominio de producción debe estar en la lista CORS del backend (`APP_DOMAIN` en producción o la URL del frontend).

## Scripts disponibles

```bash
# Desde la raíz
make dev            # desarrollo completo
make db-up          # solo bases de datos
make db-migrate     # migraciones
make db-studio      # Prisma Studio
make up             # producción Docker
make down           # parar Docker
make build          # rebuild Docker
make logs           # logs Docker
make restart        # reiniciar api+nginx
make backup         # backup PostgreSQL
make android-build  # build APK web
make android-open   # Android Studio
make android-run    # instalar en dispositivo

# Desde packages/backend
npm run dev         # tsx watch
npm run build       # tsc (verificar tipos)

# Desde packages/web
npm run dev         # Vite dev server
npm run build       # build producción (web)
npm run build:android  # build para APK
npm run build:docker   # build sin tsc (Dockerfile)
npm run lint        # ESLint
```
