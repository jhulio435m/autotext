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
