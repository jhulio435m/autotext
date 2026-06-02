# Tarea: Perfil de usuario y cambio de contrasena

**Modulo**: Auth / Cuenta / Frontend
**Prioridad**: Alta
**Estado**: Completada

## Contexto

El sistema ya tiene login, sesiones JWT con `jti`, politica de contrasenas y logout real, pero el usuario autenticado no puede administrar su cuenta desde la interfaz. Cambiar nombre visible o contrasena requiere modificar seed/env o base de datos manualmente.

## Objetivos

- [x] Exponer endpoints autenticados para leer y actualizar el perfil del usuario actual.
- [x] Exponer endpoint autenticado para cambiar contrasena validando la contrasena actual.
- [x] Reutilizar la politica de contrasenas existente (`AUTH_PASSWORD_MIN_LENGTH`, comunes, email).
- [x] Revocar otras sesiones activas tras cambio de contrasena.
- [x] Agregar una vista de cuenta accesible desde el menu de usuario.
- [x] Persistir el usuario actualizado en el store/localStorage.
- [x] Cubrir el flujo critico con tests de backend.
- [x] Documentar los endpoints nuevos.

## Criterios de aceptacion

1. El usuario ve su email, rol y nombre actual desde `/cuenta`.
2. El usuario puede cambiar su nombre visible sin tocar la base de datos manualmente.
3. El cambio de contrasena exige contrasena actual correcta y nueva contrasena conforme a politica.
4. Si la contrasena cambia, se revocan las otras sesiones activas del mismo usuario y se mantiene la sesion actual.
5. Los errores de contrasena actual usan una respuesta generica.
6. `npm test` pasa.
7. **REGLA DE CIERRE**: una vez verificado, renombrar este archivo a `014-account-profile-management.done.md`.
