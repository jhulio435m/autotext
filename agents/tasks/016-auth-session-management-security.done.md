# Tarea: Seguridad Avanzada y Gestion de Sesiones

**Modulo**: Auth / Seguridad / Cuenta
**Prioridad**: Media
**Estado**: Pendiente

## Contexto

Tras la implementacion de la gestion basica de cuenta y endurecimiento de seguridad, se requiere mayor visibilidad y control para el usuario sobre su seguridad y sesiones activas.

## Objetivos

- [ ] **Auditoria de Sesiones para el Usuario**:
  - [ ] Backend: Endpoint para listar sesiones activas del usuario (IP, User-Agent, Fecha de creacion, Ultima actividad).
  - [ ] Frontend: Mostrar lista de dispositivos/sesiones activas en la pagina de Cuenta.
- [ ] **Control de Sesiones**:
  - [ ] Frontend: Opcion para cerrar sesiones individuales (revocar `jti` especifico).
  - [ ] Frontend: Boton de "Cerrar todas las demas sesiones" sin cambiar contraseña.
- [ ] **Fortalecimiento de Contraseña**:
  - [ ] Frontend: Indicador de fortaleza de contraseña (visual) al cambiar o resetear.
  - [ ] Frontend: Sugerencia de contraseñas seguras.
- [ ] **Notificaciones de Seguridad**:
  - [ ] Backend: (Simulado o real) Enviar correo al usuario cuando se inicia sesion desde una IP nueva.
  - [ ] Backend: Notificar por correo tras un cambio exitoso de contraseña.
- [ ] **Mejoras de Perfil**:
  - [ ] Frontend: Permitir subir una foto de perfil (avatar).
  - [ ] Backend: Almacenamiento de avatar (Local o S3/Cloudinary).

## Criterios de Aceptacion

1. El usuario puede ver desde que dispositivos tiene sesiones abiertas.
2. Es posible cerrar la sesion de un dispositivo remoto sin afectar la sesion actual.
3. El indicador de fortaleza de contraseña ayuda al usuario a elegir claves mas robustas.
4. `npm test` sigue pasando con las nuevas funcionalidades de revocacion selectiva.
5. **REGLA DE CIERRE**: una vez verificado, renombrar este archivo a `016-auth-session-management-security.done.md`.
