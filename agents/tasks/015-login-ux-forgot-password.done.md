# Tarea: Mejoras de Login y Recuperacion de Contrasena

**Modulo**: Auth / Login / UX
**Prioridad**: Media-Alta
**Estado**: En progreso

## Contexto

El login actual funciona pero tiene credenciales hardcoded ("placeholders") en el estado inicial de React, lo cual es util para desarrollo pero inadecuado para produccion. Ademas, no existe un flujo de "Olvide mi contrasena", y la experiencia de navegacion tras el login no respeta la ruta a la que el usuario intentaba acceder inicialmente.

## Objetivos

- [ ] **Limpiar Login**: Eliminar email y password hardcoded en `src/pages/Login/index.jsx`.
- [ ] **Redireccion Inteligente**: Al ser redirigido al login por falta de sesion, guardar la ruta original y redirigir alli tras un login exitoso.
- [ ] **Flujo de Recuperacion de Contrasena**:
  - [ ] Backend: Endpoint `POST /api/auth/forgot-password` para solicitar reseteo (genera token temporal).
  - [ ] Backend: Endpoint `POST /api/auth/reset-password` para aplicar el cambio con el token.
  - [ ] Frontend: Vista de "Olvide mi contrasena" para ingresar email.
  - [ ] Frontend: Vista de "Nueva contrasena" (usando el token de la URL).
- [ ] **Mejoras de UI/UX en Login**:
  - [ ] Auto-focus en el campo de email.
  - [ ] Link a "Olvide mi contrasena".
  - [ ] Mejorar mensajes de error (ej: detectar cuando el servidor API no responde).
  - [ ] Feedback visual mas claro durante la carga.
- [ ] **Seguridad**:
  - [ ] Los tokens de reseteo deben ser de un solo uso, expirar en poco tiempo (ej: 1 hora) y guardarse hasheados en DB.
  - [ ] El flujo de "Olvide mi contrasena" no debe confirmar si el email existe o no (respuesta generica).
- [ ] **Tests**: Cubrir el nuevo flujo de reseteo en el backend.

## Criterios de Aceptacion

1. El login carga con los campos vacios.
2. Si intento entrar a `/dashboard` sin sesion, me lleva a `/` y tras loguearme me devuelve a `/dashboard` (no siempre a `/dashboard` por defecto).
3. Existe un enlace funcional para iniciar el proceso de recuperacion.
4. El proceso de recuperacion valida la politica de contrasenas existente.
5. Los tokens de reseteo son seguros y efimeros.
6. `npm test` pasa.
7. **REGLA DE CIERRE**: una vez verificado, renombrar este archivo a `015-login-ux-forgot-password.done.md`.
