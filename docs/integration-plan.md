# Plan de Integracion del Proyecto (Autotext + Plane + Frappe)

## Objetivo
Unificar el proyecto para que pueda operar en 4 modos de forma controlada, con el menor cambio de codigo:

- `local`: demo/local sin dependencias externas.
- `plane-db`: lectura de Plane desde PostgreSQL.
- `plane-api`: lectura de Plane via API v1 + API key.
- `frappe`: modo orientado a endpoints de aplicacion/ERP.

## Estado actual aplicado

1. Perfiles de entorno listos en `env/profiles/`.
2. Script de conmutacion `scripts/use-profile.sh`.
3. Endpoint de diagnostico `GET /api/integration/status`.
4. Scripts npm para conmutar perfil y correr en modo publico (SSH/LAN).

## Fase 1 (ya implementada)

- Estandarizacion de configuraciones por perfil.
- Diagnostico rapido de proveedores (DB/Plane API/Frappe).
- Arranque publico para acceso remoto por IP.

## Fase 2 (1-2 dias)

- Selector visual de modo (UI admin) que lea `/api/integration/status`.
- Banner de salud en frontend para mostrar origen real de datos.
- Validaciones de inicio para evitar configuraciones incompletas.

## Fase 3 (2-4 dias)

- Capa de adaptadores de datos:
  - `PlaneDbProvider`
  - `PlaneApiProvider`
  - `FrappeProvider`
- Misma forma de respuesta para frontend (contrato unico).
- Test de contrato por proveedor.

## Fase 4 (2-3 dias)

- Persistencia de mapeos de negocio (proyecto, issue, documento) por proveedor.
- Reintentos y circuit breaker para dependencias externas.
- Logging estructurado para auditoria y soporte.

## Fase 5 (1-2 dias)

- Pipeline de despliegue por entorno (dev/staging/prod) basado en perfiles.
- Checklist operativo y runbook de incidentes.

## Operacion diaria recomendada

1. Elegir perfil:
   - `npm run profile:plane-db`
   - `npm run profile:plane-api`
   - `npm run profile:frappe`
2. Levantar app remota:
   - `npm run dev:full:public`
3. Verificar salud:
   - `curl http://127.0.0.1:4000/api/integration/status`

## Riesgos y mitigacion

- Riesgo: credenciales faltantes en `plane-api`.
  - Mitigacion: `integration/status` reporta campos faltantes.
- Riesgo: cambios de esquema en Plane DB.
  - Mitigacion: mantener `plane-api` como fallback.
- Riesgo: CORS/puertos en acceso SSH/LAN.
  - Mitigacion: usar `dev:full:public` + reglas firewall.
