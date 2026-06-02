# Tarea: Colaboracion y Comentarios en Tiempo Real

**Modulo**: UX / Backend / WebSockets
**Prioridad**: Media
**Estado**: Pendiente

## Contexto

Actualmente el sistema usa un sistema de "locks" (bloqueos) para evitar colisiones, pero la comunicacion entre usuarios es nula. Se busca transformar la experiencia en una colaborativa donde los usuarios puedan discutir secciones especificas del documento.

## Objetivos

- [ ] **Infraestructura de Tiempo Real**:
  - [ ] Configurar Socket.io en el backend de Node.js.
  - [ ] Implementar "rooms" por documento para segmentar el trafico.
- [ ] **Presencia de Usuarios**:
  - [ ] Mostrar visualmente quien mas esta viendo/editando el documento en tiempo real (avatares en el header).
  - [ ] Notificar cuando alguien adquiere o libera un bloqueo de seccion.
- [ ] **Sistema de Comentarios**:
  - [ ] Backend: Modelo para hilos de comentarios vinculados a IDs de nodos/bloques.
  - [ ] Frontend: Panel lateral de comentarios con notificaciones visuales sobre los bloques que tienen discusiones activas.
  - [ ] Permitir marcar comentarios como "resueltos".

## Criterios de Aceptacion

1. Al abrir un documento, puedo ver si otros usuarios estan conectados.
2. Puedo dejar un comentario en una seccion y otro usuario lo ve instantaneamente sin refrescar.
3. El sistema de locks sigue funcionando pero ahora se notifica via sockets de forma inmediata.
4. Los comentarios persisten en la base de datos y se asocian correctamente a la estructura del documento.
5. **REGLA DE CIERRE**: una vez verificado, renombrar este archivo a `018-collaboration-comments.done.md`.
