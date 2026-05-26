# AGENTS.md — Contexto para agentes de IA

> Ver CLAUDE.md (raíz) para instrucciones completas y arquitectura detallada.
> Este archivo es un resumen rápido para agentes que no cargan CLAUDE.md.

## Stack

- **Backend**: Fastify v5 + Prisma + PostgreSQL (`:5440` dev) + Redis (`:6390` dev) + BullMQ
- **Frontend (APK)**: React 19 + Vite 8 + Zustand + Axios — código en `packages/web/src/`
- **Mobile**: Capacitor 8 — código en `packages/android/`, construye desde `packages/web/dist/`
- **No hay app web** — el único cliente es la APK Android

## Rutas críticas

- Backend dev: `:3010` (NO `:3001`, ese puerto es Redis de Coolify)
- Frontend dev: `:5173`
- Path alias: `@/` → `packages/web/src/`

## Convenciones

- El proxy Vite **elimina** el prefijo `/api`. Las rutas Fastify NO llevan `/api`.
- `useUIStore` es la única fuente de verdad para `data-theme` y `data-accent` en `<html>`.
- `useOfflineStore` persiste la cola en localStorage. No mezclar con lógica de negocio.
- Plugins Capacitor se importan **lazy** (`await import(...)`) para no romper el bundle web.
- No hay `isNativePlatform()` — la app siempre corre en Android.
- No hay nginx — Traefik de Coolify enruta directamente a `api:3001`.

## Bugs activos — ver STATUS.md para detalles

- `i.map is not a function` crash en Routines (parche aplicado, causa raíz desconocida)

## Comandos rápidos

```bash
make dev                  # frontend :5173 + backend :3010
make android-dev-build    # APK con live reload (Capacitor → Vite HMR)
make android-build        # APK de producción (assets bundleados)
JAVA_HOME=~/java/jdk-21.0.7+6 ANDROID_HOME=~/android-sdk \
  packages/android/android/gradlew assembleDebug
```
