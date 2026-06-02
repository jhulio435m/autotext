# Task 023: API Rate Limiting en todos los endpoints

## Objetivo
Agregar rate limiting a todos los endpoints expuestos para prevenir abuso y cumplir con CodeQL.

## Cambios

### Backend
- `server/config.js` — Nuevas opciones `apiRateLimitMax` (default 60 req/min) y `apiRateLimitWindowMs`
- `server/index.js` — Rate limiter general (`apiRateLimit`) aplicado a:
  - `/api/auth/forgot-password`, `/api/auth/reset-password`
  - `/api/auth/me`, `/api/auth/sessions`, `/api/auth/logout`, `/api/auth/change-password`
  - `/api/admin/*`
  - `/api/workspace`, `/api/projects`, `/api/documents`, `/api/templates`, `/api/integration`

### Rutas cubiertas por CodeQL
- admin.js: `GET /api/admin/users`
- auth.js: forgot-password, reset-password, me, sessions, logout, change-password
- documents.js: lock, heartbeat, export
- integration.js: status, profiles, apply profile
- templates.js: list, create
- ai.js: ya tenía rate limit propio

## Verificación
- `npm test`: 92 tests pass
- `npm run build`: compila sin errores
