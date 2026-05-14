# 🚀 Guía de Despliegue: Gym Tracker

Esta guía detalla los pasos para levantar **Gym Tracker** en tu entorno local de la forma más rápida y sencilla posible, así como las instrucciones de configuración óptima para su despliegue en un servidor VPS utilizando **Coolify** (*Docker Compose Build Pack*).

---

## 🖥️ Opción 1: Entorno Local (Desarrollo Simple)

El entorno local está diseñado para requerir el mínimo esfuerzo de configuración aprovechando las herramientas integradas en el `Makefile`.

### Requisitos Previos
- **Node.js** (v22 o superior recomendado)
- **Docker** y **Docker Compose** (para levantar de forma automática la base de datos PostgreSQL)

### Paso a Paso

1. **Configurar las Variables de Entorno**
   Copia el archivo de ejemplo para crear tu configuración local:
   ```bash
   cp .env.example .env
   ```
   *(Los valores por defecto en `.env.example` ya están listos para funcionar localmente).*

2. **Levantar la Base de Datos**
   Ejecuta el siguiente comando para descargar e iniciar el contenedor de PostgreSQL en segundo plano:
   ```bash
   make db-up
   ```

3. **Iniciar la Aplicación (Frontend y Backend)**
   Con un solo comando, el proyecto instalará dependencias si es necesario, aplicará las migraciones de base de datos e iniciará ambos servidores en paralelo:
   ```bash
   make dev
   ```

> [!TIP]
> **¿Dónde accedo?**
> - **Frontend**: [http://localhost:5173](http://localhost:5173)
> - **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## 🌐 Opción 2: Servidor VPS con Coolify

Hemos optimizado la arquitectura de contenedores para que sea **100% nativa y robusta** en [Coolify](https://coolify.io/). Mediante un *build multi-etapa*, el servicio Nginx compila y empaqueta de forma autónoma el frontend, eliminando volúmenes compartidos propensos a desincronizaciones y evitando servicios efímeros inactivos.

### Paso a Paso en Coolify

1. **Crear un Nuevo Recurso**
   - En tu panel de Coolify, haz clic en **Create New Resource**.
   - Selecciona tu proveedor de Git (ej. **Public Repository** o **GitHub App** según la privacidad de tu fork/repositorio).

2. **Seleccionar el Build Pack**
   - Coolify por defecto sugiere *Nixpacks*. Haz clic en esa opción y cámbiala seleccionando **Docker Compose** en el menú desplegable.

3. **Configurar las Rutas del Build Pack**
   Asegúrate de ingresar los siguientes valores exactamente:
   - **Base Directory**: `/`
   - **Docker Compose Location**: `/docker-compose.yml`

4. **Configurar las Variables de Entorno**
   Antes de desplegar, ve a la pestaña **Environment Variables** en Coolify y define los siguientes valores obligatorios (Coolify los inyectará automáticamente en los contenedores):
   
   | Variable | Descripción | Ejemplo |
   | :--- | :--- | :--- |
   | `DB_USER` | Usuario de PostgreSQL | `postgres` |
   | `DB_PASSWORD` | Contraseña segura para la BD | `SuperSecretDBPass123!` |
   | `DB_NAME` | Nombre de la base de datos | `gym_tracker_prod` |
   | `JWT_SECRET` | Clave secreta para tokens de acceso | `CualquierCadenaLargaYSeguraAqui` |
   | `JWT_REFRESH_SECRET` | Clave secreta para refrescar tokens | `OtraCadenaLargaYSeguraDiferente` |

5. **Exposición y Dominios**
   - En la configuración de servicios de Coolify, verás listados los servicios `nginx`, `api` y `db`.
   - Asigna tu dominio personalizado (ej. `https://app.midominio.com`) directamente al servicio **`nginx`**, el cual ya expone internamente el puerto `80`.
   - Traefik (el proxy de Coolify) gestionará automáticamente los certificados SSL (HTTPS) y enrutará el tráfico de forma segura.

> [!IMPORTANT]
> **Gestión de Redes (Networking)**
> El archivo `docker-compose.yml` del proyecto ha sido diseñado **sin directivas de redes personalizadas**, cumpliendo estrictamente con la recomendación oficial de Coolify para evitar caídas intermitentes de Traefik. Coolify enlazará automáticamente todos los servicios en un *bridge* dinámico aislado.

> [!NOTE]
> **Caché de Compilación**
> Si notas que las compilaciones de Nginx/Node.js tardan, puedes ir a la pestaña **Advanced** en Coolify y verificar que la opción *"Include Source Commit in Build"* esté desactivada. Esto permite que Docker reutilice al máximo la caché entre despliegues.
