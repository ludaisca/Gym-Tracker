<div align="center">

# 🏋️ Gym Tracker

**App web de seguimiento de entrenamiento personal — instalable como PWA**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5.4-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.8-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![nginx](https://img.shields.io/badge/nginx-alpine-009639?style=flat-square&logo=nginx&logoColor=white)](https://nginx.org/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

---

## 📋 Tabla de contenidos

- [Arquitectura](#-arquitectura)
- [Requisitos](#-requisitos-previos)
- [Configuración del entorno](#-configuración-del-entorno)
- [Deploy con Coolify](#-deploy-con-coolify)
- [Docker Compose (producción)](#-docker-compose-producción)
- [Tailscale](#-tailscale)
- [Desarrollo local](#-desarrollo-local)
- [Variables de entorno](#-variables-de-entorno)

---

## 🏗 Arquitectura

```
Cliente (browser / móvil)
       │
       ▼
  nginx :80  (reverse proxy)
       │
       ├── /api/*  ──►  api (Fastify :3001)  ──►  db (PostgreSQL :5432)
       │
       └── /*      ──►  SPA (dist estático de Vite)
```

| Servicio | Imagen | Rol |
|---|---|---|
| `nginx` | `Dockerfile.nginx` | Reverse proxy + sirve el SPA |
| `web` | `Dockerfile.frontend` | Compila React con Vite (solo en build) |
| `api` | `Dockerfile.backend` | Fastify + Prisma, aplica migraciones al arrancar |
| `db` | `postgres:16-alpine` | Base de datos, datos persistentes en volumen `pgdata` |

---

## ✅ Requisitos previos

- Docker + Docker Compose
- `make`
- Node.js 22 (solo para desarrollo local)

---

## ⚙️ Configuración del entorno

Copia el archivo de ejemplo y rellena los valores:

```bash
cp .env.example .env
```

```env
# PostgreSQL
DB_NAME=gymtracker
DB_USER=gymuser
DB_PASSWORD=una_clave_segura_aqui

# Solo para desarrollo local
DATABASE_URL=postgresql://gymuser:una_clave_segura_aqui@localhost:5432/gymtracker

# Genera cada uno con: openssl rand -base64 32
JWT_SECRET=cadena_aleatoria_larga_minimo_32_caracteres
JWT_REFRESH_SECRET=otra_cadena_diferente_para_refresh
```

> 💡 Para generar secrets seguros:
> ```bash
> openssl rand -base64 32
> ```

---

## 🚀 Deploy con Coolify

Este proyecto está optimizado para desplegarse en [Coolify](https://coolify.io) usando Docker Compose.

### Pasos

1. **Conecta tu repositorio** en Coolify → New Resource → Docker Compose
2. **Desactiva "Build Secrets"** en Configuration → General (evita que Coolify corrompa los Dockerfiles)
3. **Configura las variables de entorno** en la tab *Environment Variables* con los siguientes valores:

```
DB_NAME=gymtracker
DB_USER=gymuser
DB_PASSWORD=<password_seguro>
JWT_SECRET=<openssl rand -base64 32>
JWT_REFRESH_SECRET=<openssl rand -base64 32>
```

4. **Asigna un dominio** al servicio `nginx` en la sección FQDN
5. **Despliega** — Coolify construirá las 3 imágenes y levantará el stack automáticamente

> ⚠️ **Nota:** Las variables deben marcarse como *Available at Runtime*, no solo en build time.

---

## 🐳 Docker Compose (producción)

### Primer deploy

```bash
make build
```

Este comando:
1. Construye la imagen del frontend (Vite → dist estático)
2. Construye la imagen del backend (TypeScript compilado, 2 stages)
3. Construye la imagen de nginx (config embebida)
4. Levanta los servicios en orden: `db` → `api` → `nginx`
5. El backend aplica las migraciones de Prisma automáticamente

La app queda disponible en: **`http://localhost:3000`**

### Comandos de operación

```bash
make build       # Reconstruir imágenes y levantar
make deploy      # git pull + reconstruir + levantar
make logs        # Logs en tiempo real de nginx y api
make logs-api    # Logs solo del backend
make logs-db     # Logs solo de PostgreSQL
make restart     # Reiniciar nginx y api sin tocar la BD

docker compose down      # Parar servicios (datos persisten)
docker compose down -v   # Parar y borrar todos los datos ⚠️
```

### Persistencia

Los datos de PostgreSQL se almacenan en el volumen Docker `pgdata`. Sobreviven a reinicios y a `docker compose down`. Solo se eliminan con `docker compose down -v`.

---

## 🔒 Tailscale

### Opción A — Acceso directo por IP

```bash
make build
tailscale ip -4        # Obtén tu IP de Tailscale, ej: 100.80.118.36
# Accede desde cualquier dispositivo del tailnet:
# http://100.80.118.36:3000
```

### Opción B — HTTPS con hostname (Tailscale Serve)

```bash
make build
tailscale serve --bg 3000
tailscale serve status   # Muestra la URL HTTPS del tailnet
# https://nombre-maquina.tailnet-name.ts.net
```

Para desactivar:
```bash
tailscale serve reset
```

---

## 💻 Desarrollo local

Requiere Node.js 22 instalado. Usa hot-reload con Vite + tsx watch.

```bash
# 1. Levantar solo la BD
make db-up

# 2. Instalar dependencias (primera vez)
cd frontend && npm install && cd ..
cd backend  && npm install && cd ..

# 3. Arrancar en paralelo
make dev
```

- **Frontend** (Vite): `http://localhost:5173`
- **Backend** (Fastify): `http://localhost:3001`
- El proxy de Vite redirige `/api/*` al backend automáticamente

### Acceso desde Tailscale en modo dev

```bash
cd backend  && npm run dev &
cd frontend && npm run dev -- --host
# Vite mostrará: Network: http://100.80.118.36:5173/
```

### Comandos útiles

```bash
make db-migrate    # Aplicar nuevas migraciones de Prisma
make db-studio     # Abrir Prisma Studio (explorador visual de BD)

cd frontend && npm run lint
cd frontend && npx tsc -b
cd backend  && npx tsc
```

---

## 🔐 Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `APP_PORT` | Puerto del host donde nginx expone la app | `3000` |
| `DB_NAME` | Nombre de la base de datos | `gymtracker` |
| `DB_USER` | Usuario de PostgreSQL | `gymuser` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | *(openssl rand -base64 32)* |
| `DATABASE_URL` | URL de conexión para Prisma en modo dev | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret para firmar access tokens | *(openssl rand -base64 32)* |
| `JWT_REFRESH_SECRET` | Secret para firmar refresh tokens | *(diferente al anterior)* |

---

<div align="center">

Hecho con ☕ y 🏋️

</div>
