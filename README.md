# Gym Tracker

App web de seguimiento de entrenamiento personal. Construida con React 19, Fastify, PostgreSQL y Prisma. Instalable como PWA.

---

## Arquitectura

```
Cliente (browser / móvil)
       │
       ▼
  nginx :80 (expuesto en APP_PORT del host)
       │
       ├── /api/*  ──►  api (Fastify :3001)  ──►  db (PostgreSQL :5432)
       │
       └── /*      ──►  SPA (dist de Vite)
```

Cuatro servicios Docker:

| Servicio | Imagen | Rol |
|---|---|---|
| `nginx` | `nginx:alpine` | Reverse proxy + sirve el SPA |
| `web` | `Dockerfile.frontend` | Compila React con Vite (solo en build) |
| `api` | `Dockerfile.backend` | Fastify + Prisma, aplica migraciones al arrancar |
| `db` | `postgres:16-alpine` | Base de datos, datos en volumen `pgdata` |

---

## Requisitos previos

- Docker + Docker Compose
- `make`
- Node.js 22 (solo para modo desarrollo local)

---

## 1. Configuración del entorno

Copia el archivo de variables de entorno y rellena los valores:

```bash
cp .env.example .env
```

Edita `.env`:

```env
# Puerto donde se expone la app en el host
APP_PORT=3000

# PostgreSQL
DB_NAME=gymtracker
DB_USER=gymuser
DB_PASSWORD=una_clave_segura_aqui

# Misma contraseña que DB_PASSWORD para el modo desarrollo local
DATABASE_URL=postgresql://gymuser:una_clave_segura_aqui@localhost:5432/gymtracker

# Genera cada uno con: openssl rand -base64 32
JWT_SECRET=cadena_aleatoria_larga_minimo_32_caracteres
JWT_REFRESH_SECRET=otra_cadena_diferente_para_refresh
```

---

## 2. Entorno Docker Compose (producción)

### Levantar por primera vez

```bash
make build
```

Este comando:
1. Construye la imagen del frontend (Vite → dist estático)
2. Construye la imagen del backend (TypeScript compilado)
3. Levanta los cuatro servicios en orden: `db` → `api` → `web` → `nginx`
4. El backend aplica las migraciones de Prisma automáticamente al arrancar

La app queda disponible en: **`http://localhost:3000`** (o el puerto configurado en `APP_PORT`)

### Comandos de operación

```bash
make build       # Reconstruir imágenes y levantar (usado en primer deploy o tras cambios de código)
make deploy      # git pull + reconstruir + levantar (para actualizaciones en servidor)
make logs        # Ver logs en tiempo real de nginx y api
make logs-api    # Ver solo logs del backend
make logs-db     # Ver solo logs de PostgreSQL
make restart     # Reiniciar nginx y api sin tocar la BD
docker compose down          # Parar todos los servicios (datos persisten en volumen pgdata)
docker compose down -v       # Parar y borrar todos los datos (destructivo)
```

### Persistencia de datos

Los datos de PostgreSQL se guardan en el volumen Docker `pgdata`. Sobreviven a reinicios y a `docker compose down`. Solo se borran con `docker compose down -v`.

---

## 3. Entorno Docker Compose + Tailscale

Tailscale asigna una IP privada a cada máquina de tu red. Una vez que el stack de Docker está corriendo en el servidor, cualquier dispositivo conectado al mismo tailnet puede acceder a la app directamente por la IP de Tailscale, sin configuración adicional.

### Opción A — Acceso directo por IP (más simple)

1. Levanta el stack normalmente:
   ```bash
   make build
   ```

2. Obtén la IP de Tailscale de la máquina:
   ```bash
   tailscale ip -4
   # Ejemplo: 100.80.118.36
   ```

3. Accede desde cualquier dispositivo en tu tailnet:
   ```
   http://100.80.118.36:3000
   ```

No se necesita ninguna configuración adicional. Tailscale maneja el enrutamiento a nivel de red.

---

### Opción B — Tailscale Serve (HTTPS con hostname bonito)

Tailscale Serve crea un endpoint HTTPS con un hostname del tipo `https://nombre-maquina.tailnet-name.ts.net` que enruta al puerto local.

> **Requisito:** Habilitar Tailscale Serve en el panel de administración antes de usarlo por primera vez.
> Visita: `https://login.tailscale.com/f/serve` (o el enlace que muestra el propio comando si no está activado)

1. Levanta el stack:
   ```bash
   make build
   ```

2. Configura Tailscale Serve para que apunte al puerto de la app:
   ```bash
   tailscale serve --bg 3000
   ```

3. Verifica que está activo y obtén la URL:
   ```bash
   tailscale serve status
   # Muestra la URL pública del tailnet, ej:
   # https://nombre-maquina.tailnet-name.ts.net
   ```

4. Accede desde cualquier dispositivo del tailnet usando esa URL HTTPS.

Para detener Tailscale Serve:
```bash
tailscale serve reset
```

---

## 4. Modo desarrollo local

Para desarrollo con hot-reload (Vite + tsx watch). Requiere Node.js 22 instalado en la máquina.

```bash
# 1. Levantar solo la BD en Docker
make db-up

# 2. Instalar dependencias (solo la primera vez)
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# 3. Arrancar frontend y backend en paralelo
make dev
```

- Frontend (Vite): `http://localhost:5173`
- Backend (Fastify): `http://localhost:3001`
- El proxy de Vite redirige `/api/*` al backend automáticamente

### Modo desarrollo accesible desde Tailscale

Por defecto Vite solo escucha en `localhost`. Para que sea accesible desde otros dispositivos del tailnet:

```bash
# Levantar el backend normalmente
cd backend && npm run dev &

# Levantar Vite escuchando en todas las interfaces
cd frontend && npm run dev -- --host
```

Vite mostrará las IPs disponibles, incluyendo la de Tailscale:

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://100.80.118.36:5173/
```

Accede desde otros dispositivos del tailnet en: **`http://100.80.118.36:5173`**

### Otros comandos útiles en desarrollo

```bash
make db-migrate   # Aplicar nuevas migraciones de Prisma
make db-studio    # Abrir Prisma Studio en el browser (explorador visual de la BD)

# Lint y chequeo de tipos
cd frontend && npm run lint
cd frontend && npx tsc -b
cd backend  && npx tsc
```

---

## Variables de entorno — referencia completa

| Variable | Descripción | Ejemplo |
|---|---|---|
| `APP_PORT` | Puerto del host donde nginx expone la app | `3000` |
| `DB_NAME` | Nombre de la base de datos | `gymtracker` |
| `DB_USER` | Usuario de PostgreSQL | `gymuser` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | _(usa `openssl rand -base64 32`)_ |
| `DATABASE_URL` | URL de conexión para Prisma en modo dev | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret para firmar access tokens | _(usa `openssl rand -base64 32`)_ |
| `JWT_REFRESH_SECRET` | Secret para firmar refresh tokens | _(diferente al anterior)_ |

Para generar un secret seguro:
```bash
openssl rand -base64 32
```
