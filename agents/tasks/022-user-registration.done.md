# Task 022: User Registration & Admin User Management

## Objetivo
Permitir que nuevos usuarios se registren en la aplicación y que administradores puedan listar usuarios.

## Cambios realizados

### Backend
- `server/routes/auth.js` — Nuevo endpoint `POST /api/auth/register`
  - Valida email, password (política de seguridad) y nombre
  - Verifica que el email no exista ya (409 Conflict)
  - Hash de password con bcrypt
  - Crea sesión JWT y la registra en `app_user_sessions`
  - Rate limiting aplicado (mismo que login)
- `server/routes/admin.js` — Nuevo archivo con `GET /api/admin/users`
  - Solo accesible para usuarios con role `Senior`
  - Retorna lista completa de usuarios (id, email, name, role, fechas)
- `server/index.js` — Middleware `requireAdmin` (403 si no es Senior)
  - `authRequired` ahora también carga `req.auth.role` desde BD
- `server/routes/app.js` — Registra `registerAdminRoutes`

### Frontend
- `src/pages/Register/index.jsx` — Nueva página de registro con formulario
- `src/routes/index.jsx` — Ruta `/registro`
- `src/pages/Login/index.jsx` — Link "Registrate" hacia `/registro`
- `src/api/client.js` — `apiRegister` y `apiAdminListUsers`

## Pruebas
- `test/auth-register.test.js` — Tests del endpoint de registro

## Verificación
- `npm test` pasa
- `npm run build` compila sin errores
