# Tarea: Seguridad - Endurecimiento de Autenticacion

**Estado**: Completada
**ID**: TASK-013
**Modulo**: Backend / Auth / Seguridad

## 📝 Descripcion
Endurecer la autenticacion del sistema antes de exponerlo de forma estable en ambientes publicos. Actualmente existe login con JWT, rate limit basico, `bcryptjs` y cabeceras minimas, pero falta una politica integral de seguridad para contrasenas, sesiones, bloqueo de intentos, auditoria y almacenamiento del token en cliente.

Esta tarea debe implementar una base segura y mantenible para autenticacion, priorizando controles simples, verificables y compatibles con la arquitectura Express + React existente.

## 🎯 Objetivos de la Tarea
- [x] **Hashing de contrasenas con bcrypt 12**: Centralizar el hashing y verificacion de contrasenas en un servicio de autenticacion.
  - Usar costo `12` para nuevos hashes bcrypt.
  - Reemplazar el hash seed actual de costo `10` en `server/scripts/init-db.js`.
  - Detectar hashes bcrypt validos con costo menor a `12` y re-hashear en login exitoso.
  - Rechazar hashes legacy no bcrypt sin revelar detalles al usuario.
- [x] **Politica de contrasenas**: Validar contrasenas nuevas y seed admin con reglas minimas.
  - Longitud minima configurable, por defecto `12`.
  - Rechazar contrasenas triviales o iguales al email.
  - Documentar reglas en `.env.example` y docs tecnicos.
- [x] **Proteccion contra fuerza bruta**: Fortalecer el login rate limit actual.
  - Separar limites por IP y por email normalizado.
  - Agregar bloqueo temporal por demasiados fallos consecutivos.
  - Restablecer contador al login exitoso.
  - Mantener respuestas genericas para no permitir enumeracion de usuarios.
- [x] **Sesiones y JWT**: Revisar el ciclo de vida del token y agregar controles de revocacion.
  - Agregar `iat`, `jti` y expiracion corta configurable para access tokens.
  - Definir estrategia para logout real: lista de revocacion, version de sesion por usuario, o tabla de sesiones activas.
  - Evaluar migrar el almacenamiento del token desde `localStorage/sessionStorage` a cookie `HttpOnly`, `SameSite=Lax/Strict` y `Secure` solo cuando el despliegue use HTTPS.
  - Si se mantienen bearer tokens en storage, documentar el riesgo y reducir TTL.
- [x] **Auditoria de seguridad**: Registrar eventos relevantes sin guardar secretos.
  - Login exitoso y fallido.
  - Bloqueo temporal de cuenta/email/IP.
  - Logout/revocacion.
  - Re-hash de contrasena.
  - Usar logging estructurado existente, sin imprimir passwords, JWTs ni hashes completos.
- [x] **Cabeceras y middleware de seguridad**: Completar baseline de Express.
  - Evaluar integrar `helmet` con una CSP compatible con Vite/React y Tiptap.
  - Mantener `x-powered-by` deshabilitado.
  - Agregar 404 JSON para rutas API no encontradas.
  - Verificar CORS con allowlist estricta en produccion.
- [x] **Tests de seguridad**: Cubrir los flujos criticos con `node --test`.
  - Login correcto con hash bcrypt costo `12`.
  - Re-hash automatico desde costo menor a `12`.
  - Bloqueo por intentos fallidos.
  - Respuestas genericas para usuario inexistente y password incorrecto.
  - Token expirado, invalido y revocado.
  - Seed admin rechaza contrasena insegura.

## 🛠️ Archivos Clave
- `server/routes/auth.js`
- `server/index.js`
- `server/config.js`
- `server/scripts/init-db.js`
- `server/db/schema.sql`
- `server/infrastructure/logger.js`
- `server/services/rate-limit.js`
- `src/api/session.js`
- `src/pages/Login/`
- `test/`
- `docs/architecture.md`
- `README.md`
- `server/.env.example`

## ✅ Criterios de Aceptacion
1. Todas las contrasenas nuevas y seed usan bcrypt con costo `12`.
2. Un usuario con hash bcrypt de costo menor a `12` puede iniciar sesion y queda migrado automaticamente a costo `12`.
3. El login aplica rate limit por IP y por email, con bloqueo temporal despues de fallos consecutivos configurables.
4. Las respuestas de login fallido no distinguen entre usuario inexistente, password incorrecto, cuenta bloqueada internamente o hash legacy.
5. Los tokens tienen expiracion configurable, identificador unico (`jti`) y un mecanismo documentado e implementado de revocacion o invalidacion de sesion.
6. No se registran passwords, JWTs, secretos ni hashes completos en logs.
7. La documentacion explica variables de entorno, politica de contrasenas, TTL de tokens, estrategia de logout y consideraciones de cookies seguras/HTTPS.
8. `npm test` pasa correctamente.
9. **REGLA DE CIERRE**: Una vez verificado, renombrar a `013-security-auth-hardening.done.md`.
