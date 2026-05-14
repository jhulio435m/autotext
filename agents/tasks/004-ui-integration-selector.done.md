# Tarea: Selector de Integración y Monitoreo (UI)

**Estado**: Pendiente
**ID**: TASK-004
**Módulo**: Frontend / Admin / Dashboard

## 📝 Descripción
Implementar la Fase 2 del Plan de Integración. El usuario debe poder ver y cambiar el modo de integración actual desde la interfaz y recibir feedback visual sobre el estado de las conexiones externas.

## 🎯 Objetivos de la Tarea
- [ ] **Selector de Modo**: Crear un componente en el Dashboard o Panel de Configuración para elegir entre `local`, `plane-db`, y `plane-api`.
- [ ] **Banner de Salud (Health Banner)**: Implementar un indicador visual (ej: en el header o sidebar) que muestre si la conexión con Plane/DB está activa (usando `/api/integration/status`).
- [ ] **Persistencia de Perfil**: Asegurar que al cambiar el modo en la UI, el sistema invoque los scripts necesarios o actualice la configuración del servidor (requiere endpoint en el backend).
- [ ] **Validaciones de Inicio**: Mostrar alertas si faltan credenciales críticas (como `PLANE_API_KEY`) según el modo seleccionado.

## ✅ Criterios de Aceptación
1.  El usuario puede cambiar de modo `local` a `plane-api` desde la UI.
2.  El banner muestra "Conectado" o "Error de conexión" en tiempo real o al cargar.
3.  La interfaz es amigable y sigue los principios del `docs/ui-ux-plan.md`.
4.  **REGLA DE CIERRE**: Una vez verificado, renombrar a `004-ui-integration-selector.done.md`.
