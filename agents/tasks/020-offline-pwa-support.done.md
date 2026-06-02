# Tarea: Soporte Offline y PWA (Progressive Web App)

**Modulo**: Frontend / Service Workers
**Prioridad**: Baja-Media
**Estado**: Pendiente

## Contexto

Muchos usuarios tecnicos trabajan en entornos con conectividad limitada (plantas industriales, campo, sotanos). El sistema debe permitir seguir redactando y consultando datos aun sin conexion a internet.

## Objetivos

- [ ] **Instalacion y Cache**:
  - [ ] Configurar un `manifest.json` y Service Worker para que la app sea instalable en escritorio/movil.
  - [ ] Cachear los assets estaticos (JS, CSS, Iconos) para carga instantanea offline.
- [ ] **Edicion Offline**:
  - [ ] Implementar persistencia local (IndexedDB) de los documentos que el usuario esta editando.
  - [ ] Detectar estado de red (`navigator.onLine`) y cambiar a modo "Desconectado" visualmente.
- [ ] **Sincronizacion en segundo plano**:
  - [ ] Implementar una cola de cambios que se dispare cuando la conexion se restablezca.
  - [ ] Gestion basica de conflictos (ej: avisar si el servidor tiene una version mas nueva desde que se perdio la conexion).

## Criterios de Aceptacion

1. La aplicacion carga y permite navegar por el dashboard sin internet (tras una carga inicial).
2. Puedo editar un documento offline y los cambios se guardan localmente.
3. Al recuperar conexion, los cambios se envian al servidor automaticamente.
4. Aparece un indicador de "Modo Offline" claro en la interfaz.
5. **REGLA DE CIERRE**: una vez verificado, renombrar este archivo a `020-offline-pwa-support.done.md`.
