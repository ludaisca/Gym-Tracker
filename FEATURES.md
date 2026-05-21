# Gym Tracker — Catálogo de características

> Documento de referencia doble: marketing (qué ofrece la app) y checklist de estado de implementación.
> Actualizado: 2026-05-21

---

## Leyenda de estado

| Icono | Significado |
|-------|-------------|
| ✅ | Implementado y funcional |
| ⚠️ | Parcialmente implementado / requiere configuración extra |
| 🔲 | Pendiente / no implementado |

---

## 1. Seguimiento de entrenamientos

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 1.1 | Registro de sesiones semanales por día | ✅ | weekNumber + dayId como clave compuesta |
| 1.2 | Seguimiento de ejercicios (series, kg, reps) | ✅ | Por ejercicio dentro de la sesión |
| 1.3 | Auto-relleno desde sesión anterior | ✅ | Precarga los valores del último entreno |
| 1.4 | Marcado de completitud por ejercicio | ✅ | Checkbox individual por ejercicio |
| 1.5 | Completitud general de la sesión | ✅ | Toggle de sesión completada |
| 1.6 | Registro de cardio (máquina, duración, intensidad) | ✅ | Por sesión |
| 1.7 | Notas por sesión | ✅ | Texto libre |
| 1.8 | Temporizador de descanso entre series | ✅ | Modal con cuenta regresiva |
| 1.9 | Historial completo de sesiones | ✅ | Agrupado por semana, expandible |
| 1.10 | Eliminación de sesión individual | ✅ | |
| 1.11 | Eliminación de semana completa | ✅ | |
| 1.12 | Vista de agenda semanal (estado por día) | ✅ | Completado / parcial / pendiente |
| 1.13 | Dashboard con KPIs semanales | ✅ | % completitud, racha, progreso |

---

## 2. Rutinas

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 2.1 | Rutinas predefinidas | ✅ | Push/Pull/Legs, Full Body, etc. |
| 2.2 | Creación de rutinas personalizadas | ✅ | Builder visual con mapa muscular |
| 2.3 | Editor de rutinas (días, ejercicios, series, descanso) | ✅ | Catálogo por grupo muscular |
| 2.4 | Búsqueda de ejercicios en el catálogo | ✅ | |
| 2.5 | Reordenamiento de días y ejercicios | ✅ | Drag-and-drop |
| 2.6 | Activación de rutina con reset de semana | ✅ | |
| 2.7 | Compartir rutina con código (6 caracteres) | ✅ | Genera código alfanumérico |
| 2.8 | Importar rutina por código | ✅ | |
| 2.9 | Revocar código de compartir | ✅ | |
| 2.10 | Publicar rutina en el marketplace | ✅ | Se vuelve pública y buscable |
| 2.11 | Despublicar rutina del marketplace | ✅ | |

---

## 3. Marketplace de rutinas

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 3.1 | Exploración de rutinas públicas | ✅ | Ordenadas por descargas |
| 3.2 | Búsqueda de rutinas por nombre | ✅ | |
| 3.3 | Paginación de resultados | ✅ | |
| 3.4 | Clonar rutina pública a la biblioteca personal | ✅ | Incrementa contador de descargas |
| 3.5 | Contador de descargas por rutina | ✅ | |

---

## 4. Nutrición

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 4.1 | Registro diario de comidas (desayuno, almuerzo, cena, snack) | ✅ | |
| 4.2 | Seguimiento de macros (kcal, proteína, carbos, grasa) | ✅ | |
| 4.3 | Seguimiento de ingesta de agua | ✅ | En vasos |
| 4.4 | Objetivos de calorías y macros (vs. real) | ✅ | |
| 4.5 | Base de datos de alimentos guardados (plantillas) | ✅ | Búsqueda y reutilización |
| 4.6 | CRUD de alimentos guardados | ✅ | Crear, listar, eliminar |
| 4.7 | Agregar alimento a comida | ✅ | Por tipo de comida |
| 4.8 | Eliminar alimento de comida | ✅ | |
| 4.9 | Navegación por fechas | ✅ | Selector de día |
| 4.10 | Carga por lote de múltiples días | ✅ | Batch endpoint (máx. 30 días) |
| 4.11 | Análisis de alimentos por foto (IA) | ⚠️ | Requiere clave de IA configurada por el usuario |

---

## 5. Estadísticas y progreso

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 5.1 | Registro de peso corporal | ✅ | Por fecha |
| 5.2 | Gráfica de tendencia de peso | ✅ | |
| 5.3 | Récords personales (PRs) por ejercicio | ✅ | Mejor kg, reps, 1RM estimado |
| 5.4 | Gráfica de progreso por ejercicio | ✅ | Semana a semana |
| 5.5 | Volumen total semanal (kg × reps) | ✅ | |
| 5.6 | Racha de semanas completadas | ✅ | ≥ 75% de días completados |
| 5.7 | Sistema de logros / achievements | ✅ | Más de 10 logros desbloqueables |
| 5.8 | Analytics de cardio (duración, máquinas más usadas) | ✅ | Vista Cardio dedicada |
| 5.9 | Gráfica de volumen de cardio semanal | ✅ | |
| 5.10 | 1RM estimado (fórmula de Epley) | ✅ | kg × (1 + reps/30) |

---

## 6. Asistente de IA

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 6.1 | Chat con asistente de IA | ⚠️ | Requiere clave de IA propia del usuario |
| 6.2 | Análisis del entrenamiento de la semana | ⚠️ | Requiere clave de IA propia del usuario |
| 6.3 | Análisis de alimentos por imagen | ⚠️ | Requiere clave de IA propia del usuario |
| 6.4 | Historial de chat persistente | ✅ | Guardado por usuario |
| 6.5 | Soporte de múltiples proveedores (OpenAI, Anthropic…) | ✅ | Configurable en perfil |
| 6.6 | Clave de IA cifrada en servidor | ✅ | Nunca expuesta al cliente |
| 6.7 | Limpieza del historial de chat | ✅ | |

---

## 7. Retos / Duelos

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 7.1 | Crear reto con código de 6 caracteres | ✅ | |
| 7.2 | Unirse a reto por código | ✅ | |
| 7.3 | Tipos de reto: check-in, versus, ambos | ✅ | |
| 7.4 | Check-in con foto y marca de agua | ✅ | Watermark frontend |
| 7.5 | Geolocalización opcional en check-in | ✅ | lat/lng |
| 7.6 | Vista de versus (comparativa de rendimiento) | ✅ | Mejor peso, reps y 1RM por ejercicio |
| 7.7 | Seguimiento de estado del reto (pendiente / activo / terminado) | ✅ | |
| 7.8 | Expiración automática del reto | ✅ | Duración configurable 1-90 días |
| 7.9 | Estadísticas de check-ins por usuario | ✅ | |

---

## 8. Notificaciones push

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 8.1 | Suscripción a notificaciones push (Web Push / VAPID) | ✅ | Navegador web |
| 8.2 | Cancelar suscripción web | ✅ | |
| 8.3 | Notificación de prueba (Web Push + FCM) | ✅ | |
| 8.4 | Limpieza automática de suscripciones inválidas | ✅ | 410 Gone / token expirado |
| 8.5 | Recordatorio diario configurable (APK) | ✅ | FCM · hora configurable en Config → solo APK |
| 8.6 | Token FCM registrado en backend al arrancar la APK | ✅ | `POST /push/fcm-token` |
| 8.7 | Notificaciones con app cerrada (Android) | ✅ | Firebase Cloud Messaging |
| 8.8 | Notificaciones de check-in en retos | 🔲 | No implementado |

---

## 9. Notas y checklists

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 9.1 | Crear notas / checklists | ✅ | |
| 9.2 | Editar notas | ✅ | |
| 9.3 | Marcar nota como completada | ✅ | |
| 9.4 | Reordenar notas | ✅ | |
| 9.5 | Eliminar notas | ✅ | |

---

## 10. Autenticación y cuenta

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 10.1 | Registro con email y contraseña | ✅ | |
| 10.2 | Verificación de email | ✅ | Token con enlace |
| 10.3 | Reenvío de verificación | ✅ | Rate limited |
| 10.4 | Login con JWT + refresh token | ✅ | Access token en memoria, refresh en DB |
| 10.5 | Renovación automática de token | ✅ | Interceptor Axios con singleton |
| 10.6 | Logout con blacklist de JWT (Redis) | ✅ | |
| 10.7 | Recuperación de contraseña | ✅ | Enlace temporal por email |
| 10.8 | Cambiar contraseña | ✅ | |
| 10.9 | Rate limiting en endpoints de auth | ✅ | Brute force protection |
| 10.10 | Eliminar cuenta | ✅ | |

---

## 11. Perfil y configuración

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 11.1 | Editar nombre y email | ✅ | |
| 11.2 | Avatar de usuario | ✅ | |
| 11.3 | Tema claro / oscuro | ✅ | |
| 11.4 | Color de acento (5 opciones) | ✅ | |
| 11.5 | Configuración de objetivos (calorías, macros, agua) | ✅ | |
| 11.6 | Configuración de proveedor de IA (proveedor, clave, modelo) | ✅ | |
| 11.7 | Exportar todos los datos del usuario (JSON) | ✅ | |
| 11.8 | Importar datos de usuario (procesamiento en background) | ✅ | |

---

## 12. PWA e instalación

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 12.1 | Instalable como PWA (Add to Home Screen) | ✅ | Manifest + SW |
| 12.2 | Modo standalone (sin barra de navegador) | ✅ | |
| 12.3 | Icono en pantalla de inicio (192 / 512 px, maskable) | ✅ | |
| 12.4 | Soporte de orientación portrait | ✅ | |
| 12.5 | Aviso de actualización disponible | ✅ | `<ReloadPrompt />` |
| 12.6 | Caché de assets (JS, CSS, imágenes, fuentes) | ✅ | Workbox / CacheFirst |
| 12.7 | Cache de API con NetworkFirst | ✅ | |

---

## 13. Modo sin conexión (offline)

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 13.1 | Cola de escrituras pendientes cuando no hay red | ✅ | Hasta 200 acciones, TTL 7 días |
| 13.2 | Replay automático al recuperar conexión | ✅ | En serie, sin race conditions |
| 13.3 | Reintentos con backoff (máx. 5) | ✅ | |
| 13.4 | Descarte de errores no recuperables (4xx) | ✅ | |
| 13.5 | Indicador de estado offline en UI | ✅ | |
| 13.6 | Gestión manual de cola desde Config | ✅ | |

---

## 14. APK Android

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 14.1 | Wrapper nativo con Capacitor 8 | ✅ | AppId: com.ludaisca.gymtracker |
| 14.2 | Mismo código fuente que la web | ✅ | Build `--mode android` |
| 14.3 | Deep links `gymtracker://` | ✅ | Para retorno de Stripe |
| 14.4 | Build con Java 21 (Gradle compatible) | ✅ | `~/java/jdk-21.0.7+6` en gradle.properties |
| 14.5 | Instalación directa en dispositivo (USB) | ✅ | `adb install` / `make android-run` |
| 14.6 | Plugin de Browser (Capacitor) para OAuth / Stripe | ✅ | |
| 14.7 | Back button con doble toque para salir | ✅ | `@capacitor/app` — patrón doble-toque < 2 s |
| 14.8 | Status bar sincronizada con el tema | ✅ | `@capacitor/status-bar` — no solapa WebView |
| 14.9 | Cámara nativa en check-ins de Duelos | ✅ | `@capacitor/camera` — cámara del sistema Android |
| 14.10 | Push notifications nativas FCM | ✅ | `@capacitor/push-notifications` + Firebase |
| 14.11 | Recordatorio diario de entrenamiento (configurable) | ✅ | BullMQ repite cada 60 s, escanea `reminderTime` |
| 14.12 | Publicación en Google Play Store | 🔲 | APK debug lista; falta firma release + ficha |

> **Bugs activos en APK** (ver STATUS.md para detalle):
> - `i.map is not a function` crash en pantalla Rutinas — parche defensivo aplicado, causa raíz no confirmada
> - Config muestra "Usuario" con campos vacíos — fix aplicado, persiste en sesiones antiguas hasta re-login
> - Status bar solapaba contenido — resuelto en APK nueva con `overlaysWebView: false`

---

## 15. Facturación (Stripe)

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 15.1 | Checkout de suscripción mensual | ✅ | |
| 15.2 | Checkout de suscripción anual | ✅ | |
| 15.3 | Portal del cliente Stripe | ✅ | Gestión de suscripción |
| 15.4 | Webhook con verificación de firma | ✅ | |
| 15.5 | Actualización automática de plan al pagar | ✅ | |
| 15.6 | Deep link de retorno para Android | ✅ | `gymtracker://upgrade/success` |
| 15.7 | Prueba gratuita de 7 días | ✅ | Endpoint `POST /users/me/trial` |
| 15.8 | Concesión de Pro vitalicio (admin) | ✅ | `POST /users/admin/grant-pro` |

> **Nota actual**: el modelo de monetización está desactivado en el frontend — todas las features son gratuitas para todos los usuarios. El backend tiene los guards `requirePro` implementados pero sin efecto desde el cliente.

---

## 16. Backend e infraestructura

| # | Característica | Estado | Notas |
|---|---------------|--------|-------|
| 16.1 | API REST con Fastify v5 | ✅ | |
| 16.2 | ORM Prisma + PostgreSQL | ✅ | |
| 16.3 | Caché Redis (historial de sesiones) | ✅ | Invalidación por mutación |
| 16.4 | Cola de trabajos en background (BullMQ) | ✅ | Importaciones pesadas, emails |
| 16.5 | Emails transaccionales (Nodemailer) | ✅ | Sin SMTP → log en consola en dev |
| 16.6 | Validación de esquemas con Zod | ✅ | En todas las rutas |
| 16.7 | Rate limiting por endpoint | ✅ | Configurable por ruta |
| 16.8 | CORS configurable por entorno | ✅ | `origin: true` en dev, dominio en prod |
| 16.9 | Proxy nginx en producción | ✅ | Coolify + Traefik |
| 16.10 | Docker Compose (dev + producción) | ✅ | override para dev local |
| 16.11 | Panel de monitoreo de colas | ✅ | `/api/admin/queues` |
| 16.12 | Backup de base de datos | ✅ | `make backup` → PostgreSQL dump |

---

## Resumen ejecutivo

| Dominio | Implementado | Parcial | Pendiente |
|---------|:-----------:|:-------:|:---------:|
| Entrenamientos | 13 | 0 | 0 |
| Rutinas | 11 | 0 | 0 |
| Marketplace | 5 | 0 | 0 |
| Nutrición | 10 | 1 | 0 |
| Estadísticas | 10 | 0 | 0 |
| Asistente IA | 4 | 3 | 0 |
| Retos / Duelos | 9 | 0 | 0 |
| Push notifications | 7 | 0 | 1 |
| Notas | 5 | 0 | 0 |
| Auth y cuenta | 10 | 0 | 0 |
| Perfil / Config | 8 | 0 | 0 |
| PWA | 7 | 0 | 0 |
| Offline | 6 | 0 | 0 |
| APK Android | 6 | 0 | 3 |
| Facturación | 8 | 0 | 0 |
| Backend / Infra | 12 | 0 | 0 |
| **TOTAL** | **128** | **4** | **5** |

---

## Características pendientes más relevantes

| Prioridad sugerida | Característica | Esfuerzo estimado |
|--------------------|---------------|-------------------|
| Alta | Triggers automáticos de push (recordatorios de sesión) | Medio |
| Alta | Push nativo en Android (Capacitor plugin) | Medio |
| Media | Cámara nativa en Android (foto check-in) | Bajo |
| Media | Activar modelo Pro desde el frontend | Bajo |
| Baja | Publicación en Google Play Store (firma + ficha) | Alto |
