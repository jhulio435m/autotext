# Tarea: Refactorización a Arquitectura Pragmática (Piloto)

**Estado**: Pendiente
**ID**: TASK-002
**Módulo**: Infraestructura / Sync / Proyectos

## 📝 Descripción
Para mejorar la mantenibilidad del proyecto sin añadir la complejidad excesiva de una arquitectura hexagonal pura, se ha decidido migrar hacia una **Arquitectura de Capas por Funcionalidad (Feature-Based Layered Architecture)**. El objetivo es separar la lógica de negocio (Dominio) de la infraestructura (Express/DB).

Esta tarea consiste en aplicar este patrón al módulo de **Sincronización de Proyectos desde Plane** como piloto.

## 🎯 Objetivos de la Tarea
- [ ] **Definir la Capa de Infraestructura**: Mover la lógica de acceso directo a datos y clientes externos a `server/infrastructure/`.
  - Crear/Mover cliente de Plane API.
  - Crear/Mover adaptadores de base de datos específicos.
- [ ] **Extraer el Core (Dominio)**: Identificar y mover funciones puras de transformación y normalización de datos a `server/core/`.
  - Funciones que transforman el esquema de Plane al esquema de Autotext.
- [ ] **Crear la Capa de Feature (Aplicación)**: Implementar la orquestación en `server/features/sync/`.
  - Un servicio que coordine: llamar a infraestructura -> normalizar en core -> persistir en infraestructura.
- [ ] **Simplificar las Rutas**: Refactorizar `server/routes/plane.js` y `server/routes/workspace.js` (u otros relevantes) para que solo actúen como puntos de entrada, delegando la lógica a las "Features".

## 🛠️ Archivos Clave Potenciales
- `server/services/plane-sync.js` (Origen de la lógica de sync)
- `server/services/plane-api.js` (Origen de la lógica de API)
- `server/routes/plane.js` (Punto de entrada)
- `server/providers/plane-db.js`

## ✅ Criterios de Aceptación
1.  **Independencia del Core**: Las funciones en `server/core/` no deben importar nada de Express ni realizar consultas directas a la base de datos (deben ser puras o casi puras).
2.  **Rutas "Flacas"**: Los controladores de ruta no deben contener lógica de transformación de datos ni consultas SQL complejas; solo deben llamar a la "Feature" correspondiente.
3.  **Funcionalidad Intacta**: La sincronización de proyectos debe seguir funcionando correctamente.
4.  **REGLA DE CIERRE**: Una vez verificado y testeado, renombrar este archivo a `002-refactor-arquitectura-pragmatica.done.md`.

---
**Nota para el agente**: Crea una rama `task/refactor-arquitectura-piloto` antes de empezar. Sigue el ejemplo de organización discutido: Core (lógica), Features (orquestación), Infrastructure (datos).
