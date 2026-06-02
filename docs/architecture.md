# Arquitectura del Servidor (Autotext)

El servidor de Autotext utiliza una **Arquitectura de Capas por Funcionalidad (Feature-Based Layered Architecture)** pragmática. El objetivo es mantener la lógica de negocio protegida de los detalles de infraestructura (base de datos, frameworks, APIs externas).

## Capas

### 1. Core (`server/core/`)
Contiene el "cerebro" de la aplicación.
- **Responsabilidad**: Reglas de negocio, mappers, transformaciones de datos, validaciones jerárquicas.
- **Regla de Oro**: No debe depender de Express, de la base de datos o de librerías de infraestructura. Debe consistir principalmente en funciones puras.
- **Ejemplo**: `plane-mapper.js` (transforma datos crudos de Plane a entidades de Autotext).

### 2. Infrastructure (`server/infrastructure/`)
Contiene las herramientas y adaptadores externos.
- **Responsabilidad**: Clientes de API (fetch), repositorios de base de datos (SQL), sistemas de archivos, circuit breaker, logging.
- **Ejemplo**: `plane-client.js` (comunicación HTTP con retry exponential backoff), `project-repository.js` (consultas SQL), `circuit-breaker.js` (patrón circuit breaker para dependencias externas), `logger.js` (logging estructurado JSON).

### 3. Features (`server/features/`)
Contiene la orquestación de casos de uso específicos. Cada subdirectorio es una "funcionalidad".
- **Responsabilidad**: Coordinar la llamada a la infraestructura, pasar datos por el core para transformarlos y persistir los resultados.
- **Ejemplo**: `sync/sync-projects.js` (orquestador de sincronización).

### 4. Routes (`server/routes/`)
Punto de entrada de la aplicación (Express).
- **Responsabilidad**: Recibir peticiones HTTP, validar parámetros básicos (requests) y delegar a una **Feature** o llamar directamente a **Infrastructure/Core** para consultas simples.
- **Meta**: Mantener las rutas "flacas" (sin lógica de negocio pesada).

## Flujo de Datos Típico

1. **Request**: Llega a `routes/plane.js`.
2. **Orquestación**: La ruta llama a `features/data-provider.js` o una función en `features/sync/`.
3. **Acceso Externo**: La feature llama a `infrastructure/plane-client.js` (con retry exponential backoff y circuit breaker) para obtener datos.
4. **Transformación**: La feature pasa los datos obtenidos a `core/plane-mapper.js` para normalizarlos.
5. **Persistencia**: La feature guarda los datos normalizados usando `infrastructure/project-repository.js`.
6. **Response**: La ruta envía el resultado al cliente.

## Módulos recientes

### Circuit Breaker (`server/infrastructure/circuit-breaker.js`)
- Estados: `closed` (normal), `open` (fallando), `half-open` (probando recuperación).
- Si fallan N llamadas consecutivas (configurable, default 3), se abre el circuito.
- Tras un timeout (default 30s), pasa a `half-open` y permite una llamada de prueba.
- Si la llamada de prueba falla, vuelve a `open`; si funciona, vuelve a `closed`.

### Logger (`server/infrastructure/logger.js`)
- Logging estructurado en formato JSON.
- Niveles: `debug`, `info`, `warn`, `error`.
- Configurable via `LOG_LEVEL` en env.
- Incluye timestamp ISO, nivel, fuente y metadatos adicionales.

### Seguridad de autenticacion (`server/services/auth-security.js`)
- Centraliza la politica de contrasenas, hashing bcrypt, generacion de `jti` y hashing de identificadores de sesion.
- Nuevas contrasenas usan bcrypt costo `12` por defecto (`AUTH_BCRYPT_COST`) y los hashes bcrypt antiguos se re-hashean al iniciar sesion correctamente.
- La politica de contrasenas usa longitud minima configurable (`AUTH_PASSWORD_MIN_LENGTH`) y una denylist versionada en `server/security/common-passwords.txt`, descargada de SecLists `10k-most-common.txt`.
- Los intentos fallidos incrementan `app_users.failed_login_count`; al superar `AUTH_FAILED_LOGIN_MAX`, `locked_until` bloquea temporalmente el login.
- Los JWT incluyen `iat`, `exp` y `jti`. El `jti` se guarda hasheado en `app_user_sessions`, lo que permite revocar logout sin almacenar tokens en claro.
- `POST /api/auth/logout` marca la sesion como revocada. `authRequired` solo acepta tokens no expirados con sesion activa.
- El frontend conserva bearer tokens en `localStorage/sessionStorage` por compatibilidad. En despliegues HTTPS se puede activar cookie `HttpOnly` con `AUTH_SESSION_COOKIE_ENABLED=true` y `AUTH_SESSION_COOKIE_SECURE=true`.
- Los eventos de seguridad se registran con `logger` sin passwords, JWTs, secretos ni hashes completos.
- La gestion de cuenta vive bajo `/api/auth/me` y `/api/auth/change-password`: el usuario autenticado puede leer/actualizar su nombre visible y cambiar contrasena validando la actual. Al cambiar contrasena se revocan las demas sesiones activas mediante `app_user_sessions`, manteniendo el `jti` de la solicitud actual.

### Retry con Exponential Backoff (`server/infrastructure/plane-client.js`)
- Hasta 3 reintentos con backoff: 1s, 2s, 4s.
- Aplica a todas las llamadas `fetchPlaneApiJson`.

### Data Provider (`server/features/data-provider.js`)
- Strategy pattern que selecciona el proveedor activo según la configuración.
- `plane-api` cuando hay `PLANE_BASE_URL + PLANE_WORKSPACE_SLUG + PLANE_API_KEY`.
- `plane-db` cuando se lee directo de PostgreSQL.

## Beneficios
- **Testeabilidad**: Podemos testear el `core` sin levantar bases de datos.
- **Intercambiabilidad**: Podemos cambiar la API de Plane por otra sin tocar la lógica de exportación.
- **Mantenibilidad**: Es fácil encontrar dónde reside cada parte de la lógica.
- **Resiliencia**: Circuit breaker y retry protegen contra fallos en cascada de dependencias externas.

## Capacidades documentales 2026-06

- **Recuperacion y sesiones**: Auth soporta recuperacion de contrasena con tokens hasheados de un solo uso, expiracion corta, revocacion de sesiones y listado de dispositivos activos desde Cuenta.
- **Bibliografia**: Cada documento puede guardar referencias en `coverData.__bibliography`, importar/exportar BibTeX, insertar `\cite{clave}` en el bloque seleccionado y validar citas sin referencia antes de exportar.
- **Comentarios**: Los hilos de comentarios se guardan en `coverData.__comments`, se asocian a `nodeId`, pueden resolverse/reabrirse y se notifican entre pestanas con `BroadcastChannel`.
- **Historial**: `app_documents.version_history` persiste snapshots manuales/autosave. La UI permite nombrar versiones, comparar contra el estado actual y restaurar guardando primero una version de resguardo.
- **Offline/PWA**: La app incluye manifest y service worker para cache estatico. El cliente API cola autosaves `PUT/POST` cuando no hay conexion y reintenta al volver online.
- **Diagramas**: El editor tiene bloque `diagram` con generacion asistida por IA/local fallback, previsualizacion visual para `flowchart TD` y exportacion LaTeX como TikZ o bloque verbatim para Mermaid.

