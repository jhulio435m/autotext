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
- **Responsabilidad**: Clientes de API (fetch), repositorios de base de datos (SQL), sistemas de archivos.
- **Ejemplo**: `plane-client.js` (comunicación HTTP), `project-repository.js` (consultas SQL).

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
2. **Orquestación**: La ruta llama a una función en `features/sync/`.
3. **Acceso Externo**: La feature llama a `infrastructure/plane-client.js` para obtener datos.
4. **Transformación**: La feature pasa los datos obtenidos a `core/plane-mapper.js` para normalizarlos.
5. **Persistencia**: La feature guarda los datos normalizados usando `infrastructure/project-repository.js`.
6. **Response**: La ruta envía el resultado al cliente.

## Beneficios
- **Testeabilidad**: Podemos testear el `core` sin levantar bases de datos.
- **Intercambiabilidad**: Podemos cambiar la API de Plane por otra sin tocar la lógica de exportación.
- **Mantenibilidad**: Es fácil encontrar dónde reside cada parte de la lógica.
