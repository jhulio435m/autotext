# Guía para Agentes de IA - Autotext

Bienvenido al proyecto **Autotext**. Esta guía describe la arquitectura, tecnologías y el flujo de trabajo para agentes de IA que colaboren en este repositorio.

## 🏗️ Estructura del Proyecto

- `/src`: Frontend desarrollado con React 19 y Vite.
  - `/components`: Componentes UI reutilizables.
  - `/pages`: Vistas principales de la aplicación.
  - `/store`: Gestión de estado con Zustand.
- `/server`: Backend desarrollado con Node.js y Express 5.
  - `/routes`: Endpoints de la API (flacos, sin lógica de negocio).
  - `/core`: Lógica de negocio pura (mappers, transformaciones). Sin dependencias de Express/DB.
  - `/infrastructure`: Clientes HTTP, repositorios SQL, circuit breaker, logger.
  - `/features`: Orquestación de casos de uso (data-provider, sync).
  - `/services`: Servicios auxiliares (integración, locks, PDF).
  - `/db`: Esquemas y scripts de base de datos.
  - `/scripts`: Migraciones y utilidades de BD.
- `/docs`: Documentación técnica detallada y planes de integración.
- `/scripts`: Scripts de utilidad para despliegue y configuración.
- `/agents`: Directorio dedicado a la coordinación de agentes de IA.
- `/test`: Tests unitarios (Node.js test runner, `node --test`).
- `/env/profiles`: Perfiles de entorno (local, plane-db, plane-api).

## 🛠️ Tecnologías Principales

- **Frontend**: React 19, Vite, Tailwind CSS 4, Zustand, Tiptap (Editor de texto), KaTeX (Matemáticas), dnd-kit (drag & drop), fortune-sheet (hojas de cálculo).
- **Backend**: Node.js, Express 5, PostgreSQL (dual: Plane DB bridge + App DB propia), JWT (auth), OpenAI (generación de texto IA).
- **Testing**: Node.js test runner integrado (`node --test`), 71 tests unitarios.
- **Infraestructura**: Docker, Cloudflare Tunnels para exposición pública, LaTeX (texlive) para exportación PDF.

## 📐 Arquitectura de Capas (Backend)

El backend sigue una **Arquitectura de Capas por Funcionalidad**:

```
routes/  →  features/  →  infrastructure/  +  core/
  (HTTP)     (orquestación)    (datos externos)   (lógica pura)
```

- **core/**: Funciones puras de transformación (mappers). No importan Express ni BD.
- **infrastructure/**: Clientes HTTP, repositorios SQL, circuit breaker, logger.
- **features/**: Orquestación que coordina infrastructure + core.
- **routes/**: Puntos de entrada HTTP, delegan a features o infrastructure.

### Módulos de infraestructura clave

- `circuit-breaker.js`: Estados closed/open/half-open. 3 fallos → open, 30s reset.
- `logger.js`: Logging JSON estructurado con niveles debug/info/warn/error.
- `plane-client.js`: HTTP client con retry exponential backoff (1s, 2s, 4s).

## Modos de Integración

El sistema opera en 3 modos (sin Frappe):

- `local`: demo/local sin dependencias externas.
- `plane-db`: lectura de Plane desde PostgreSQL (bridge directo).
- `plane-api`: lectura de Plane via API REST v1 + API key.

Los modos se conmutan via `POST /api/integration/profile` o scripts npm (`npm run profile:<name>`).

## 🔄 Flujo de Trabajo (Git & Tareas)

1. **Gestión de Tareas**: Las tareas se asignan mediante archivos Markdown en el directorio `agents/tasks/`.
2. **Creación de Rama**: El agente **NUNCA** debe trabajar directamente en la rama `main`. Debe crear una rama nueva para cada tarea.
   - Formato: `task/[nombre-de-la-tarea]` o `fix/[bug-id]`.
   - Comando: `git checkout -b task/nombre-tarea`
3. **Ejecución**: El agente debe leer la tarea, investigar el código y realizar los cambios necesarios siguiendo las mejores prácticas del proyecto.
4. **Pruebas**: Siempre ejecutar los tests relevantes antes de dar por terminada una tarea (`npm test`).
5. **Finalización y Documentación**: Una vez que la tarea ha sido completada y verificada, el agente **DEBE** actualizar cualquier documentación técnica relevante en el directorio `/docs` para reflejar los cambios realizados. Finalmente, debe renombrar el archivo de la tarea agregando el sufijo `.done`.
   - Ejemplo: `agents/tasks/fix-bug.md` -> `agents/tasks/fix-bug.done.md`.
6. **Commits y PRs**:
   - Realizar commits descriptivos.
   - Si el agente tiene permisos, puede subir la rama; de lo contrario, debe indicar que los cambios están listos para ser revisados y fusionados.

## 📋 Reglas de Oro

- **Seguridad**: Nunca expongas credenciales o claves de API.
- **Calidad**: Mantén la consistencia de estilos y patrones de diseño existentes.
- **Validación**: No des por terminada una tarea sin verificar que los cambios funcionan como se espera.
- **Documentación**: Mantén los archivos en `/docs` siempre actualizados. Si cambias la arquitectura o añades una funcionalidad, la documentación debe reflejarlo inmediatamente.
