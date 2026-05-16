# Plan de correcciones y mejoras — Gym Tracker v1

Generado el 2026-05-15 a partir de auditoría técnica completa.

---

## CORRECCIONES POR PRIORIDAD

### Inmediatas — Seguridad crítica

- [x] **[1] Validar ENCRYPTION_KEY en startup**
  - Archivo: `packages/backend/src/app.ts`
  - Si ENCRYPTION_KEY ausente o < 32 chars → lanzar error fatal al arrancar
  - Evita que aiKey se guarde/use en texto plano

- [x] **[2] Reducir rate-limit de login**
  - Archivo: `packages/backend/src/app.ts`
  - De 10/15min → 3/15min para rutas de login
  - También afecta /auth/register: mantener en 5/hour

- [x] **[3] Corregir CORS en producción**
  - Archivo: `packages/backend/src/app.ts`
  - Eliminar `https://localhost` de lista de producción
  - Agregar soporte para APP_DOMAIN via variable de entorno

- [x] **[4] Validar tamaño y quota de uploads en Challenges**
  - Archivo: `packages/backend/src/routes/challenges.ts`
  - Max 2MB por foto
  - Limpiar archivos con más de 30 días en startup o cron

### Seguridad alta

- [x] **[5] Transacciones en importación de datos**
  - Archivo: `packages/backend/src/services/importTask.ts`
  - Wrappear todo en `prisma.$transaction()`
  - Feedback granular de qué se importó y qué falló

- [x] **[6] Fix cola offline — TTL y límite de tamaño**
  - Archivo: `packages/web/src/store/index.ts` + `hooks/useOfflineSync.ts`
  - TTL de 7 días por entrada en la cola
  - Máximo 200 entradas (descartar las más antiguas)
  - Max reintentos por entrada antes de descartar

- [x] **[7] Logging de errores silenciosos en frontend**
  - Reemplazar `.catch(() => {})` con `.catch(err => console.warn(...))`
  - En 17 archivos (views/ + hooks/)

### Performance

- [x] **[8] Batch endpoint para Nutrición**
  - Backend: `GET /nutrition/batch?dates=2026-05-08,...` → devuelve array en 1 query
  - Frontend: reemplazados 7 requests paralelos por 1 llamada en `Nutrition.tsx`

- [x] **[9] Índices faltantes en Prisma**
  - Agregado `@@index([userId])` en: Routine, GlobalNote, SavedFood, RefreshToken
  - ⚠️ Pendiente aplicar con `make db-migrate` cuando la BD esté activa

### Deuda técnica

- [x] **[10] Tipos estrictos para exercises y routines**
  - Creado `packages/backend/src/types/domain.ts`
  - Interfaces: ExerciseSet, ExerciseSession, CardioData, ExerciseDef, RoutineDay
  - Función `extractBestOneRMs()` centralizada (usada en challenges.ts)
  - Eliminado bloque de 30 líneas duplicado en challenges.ts

---

## FUNCIONALIDADES NUEVAS

| # | Feature | Descripción | Esfuerzo |
|---|---------|-------------|---------|
| F1 | Recordatorios Push PWA | Notificaciones para entrenamientos programados | Medio |
| F2 | Indicador offline en AppShell | Banner persistente cuando el usuario está offline | Bajo |
| F3 | Progresión automática de peso | IA sugiere aumentar cuando reps son consistentes | Medio |
| F4 | Proyección de 1RM | Epley formula con historial real de sets | Bajo |
| F5 | Compartir rutina con link | shareable code sin infraestructura compleja | Medio |
| F6 | Analytics endpoint semanal | `GET /analytics/week/:week` — volumen, PRs | Medio |
| F7 | Marketplace de rutinas | Comunidad y engagement largo plazo | Alto |
| F8 | Apple Health / Google Fit | Wearables y datos de HR | Alto |

---

## NOTAS TÉCNICAS

- **CORS**: En producción solo `capacitor://localhost` es válido. La PWA pasa por nginx que actúa como proxy, pero documentar que APP_DOMAIN debe configurarse si se accede directamente.
- **ENCRYPTION_KEY**: Debe ser exactamente 32 bytes (256 bits) para AES-256. Generar con `openssl rand -hex 16` (32 chars hex) o `openssl rand -base64 24` (32 chars base64).
- **Java 21**: Sistema tiene Java 25. El path correcto para builds Android es `~/java/jdk-21.0.11+10`. Configurado en `packages/android/android/gradle.properties`.
- **Offline queue**: La cola vive en localStorage bajo la clave `gym-tracker-offline`. No comprimida. Puede crecer si hay muchas escrituras offline prolongadas.
