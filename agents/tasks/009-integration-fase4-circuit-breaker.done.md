# Tarea: Plan de Integración - Fase 4

**Estado**: Pendiente
**ID**: TASK-009
**Módulo**: Backend / Infrastructure / Core

## 📝 Descripción
Implementar la Fase 4 del Plan de Integración (`docs/integration-plan.md`): persistencia de mapeos de negocio, reintentos y circuit breaker para dependencias externas, y logging estructurado.

## 🎯 Objetivos de la Tarea
- [ ] **Circuit Breaker**: Implementar un patrón circuit breaker para las llamadas a Plane API y Plane DB, evitando que fallos en cascada degraden el sistema.
  - Crear `server/infrastructure/circuit-breaker.js`
  - Estados: `closed` (normal), `open` (fallando), `half-open` (probando recuperación)
- [ ] **Reintentos con backoff**: Agregar retry logic con exponential backoff a `server/infrastructure/plane-client.js`.
- [ ] **Logging Estructurado**: Implementar logging estructurado (JSON) para auditoría y soporte.
  - Crear `server/infrastructure/logger.js`
  - Loggear todas las operaciones de integración (sync, fetch, error).
- [ ] **Persistencia de mapeos**: Asegurar que los mapeos de negocio (proyecto, issue) persistan correctamente por proveedor.

## 🛠️ Archivos Clave
- `server/infrastructure/plane-client.js`
- `server/infrastructure/plane-api-provider.js`
- `server/infrastructure/plane-db-provider.js`
- `docs/integration-plan.md`

## ✅ Criterios de Aceptación
1. Si Plane API falla 3 veces consecutivas, el circuit breaker se abre y no se intenta más por 30 segundos.
2. Los reintentos usan exponential backoff (1s, 2s, 4s, max 3 intentos).
3. Los logs de integración se escriben en formato JSON en archivo o stdout.
4. `npm test` pasa correctamente.
5. **REGLA DE CIERRE**: Una vez verificado, renombrar a `009-integration-fase4-circuit-breaker.done.md`.
