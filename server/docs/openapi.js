export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Autotext API',
    version: '1.0.0',
    description: 'API de gestión de documentos técnicos con generación PDF/LaTeX, sincronización con Plane, perfiles de integración, e IA generativa.'
  },
  servers: [
    { url: '/api', description: 'API base path' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT devuelto por login/register'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: '__session',
        description: 'Cookie de sesión (opcional, alternativa a bearer)'
      }
    },
    schemas: {
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          code: { type: 'string' },
          accentColor: { type: 'string' },
          companyName: { type: 'string' },
          logo: { type: 'string' },
          month: { type: 'string' },
          year: { type: 'string' },
          coverPhoto: { type: 'string' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          description: { type: 'string' },
          structure: { type: 'array', items: { type: 'object' } },
          formData: { type: 'object' },
          coverData: { type: 'object' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Workspace: {
        type: 'object',
        properties: {
          projects: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
          documents: { type: 'object', additionalProperties: { type: 'array', items: { $ref: '#/components/schemas/Document' } } },
          coverConfig: { type: 'object' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['Senior', 'Gestor', 'Usuario'] },
          avatar: { type: 'string', nullable: true }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar nuevo usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 12 },
                  name: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Usuario registrado', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
          '400': { description: 'Datos inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Login exitoso', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
          '401': { description: 'Credenciales inválidas' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Obtener perfil del usuario autenticado',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': { description: 'Perfil del usuario', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } }
        }
      },
      put: {
        tags: ['Auth'],
        summary: 'Actualizar perfil (nombre, avatar)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  avatar: { type: 'string', description: 'Base64 data URI de la imagen, o null para eliminar' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Perfil actualizado' },
          '400': { description: 'Datos inválidos' }
        }
      }
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Solicitar restablecimiento de contraseña',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { email: { type: 'string', format: 'email' } }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Solicitud procesada (respuesta genérica por seguridad)' }
        }
      }
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Restablecer contraseña con token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                  token: { type: 'string' },
                  newPassword: { type: 'string', minLength: 12 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Contraseña restablecida' },
          '400': { description: 'Token inválido o expirado' }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Cerrar sesión',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: { '200': { description: 'Sesión cerrada' } }
      }
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Cambiar contraseña',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 12 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Contraseña cambiada' },
          '401': { description: 'Contraseña actual incorrecta' }
        }
      }
    },
    '/auth/sessions': {
      get: {
        tags: ['Auth'],
        summary: 'Listar sesiones activas',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': { description: 'Lista de sesiones', content: { 'application/json': { schema: { type: 'object', properties: { sessions: { type: 'array', items: { type: 'object' } } } } } } }
        }
      }
    },
    '/auth/sessions/{sessionId}': {
      delete: {
        tags: ['Auth'],
        summary: 'Revocar una sesión',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Sesión revocada' } }
      }
    },
    '/auth/sessions/revoke-others': {
      post: {
        tags: ['Auth'],
        summary: 'Revocar todas las demás sesiones',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: { '200': { description: 'Otras sesiones revocadas' } }
      }
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Listar usuarios (solo Senior)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Lista de usuarios', content: { 'application/json': { schema: { type: 'object', properties: { users: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } } },
          '403': { description: 'No autorizado (no Senior)' }
        }
      }
    },
    '/workspace': {
      get: {
        tags: ['Workspace'],
        summary: 'Obtener workspace del usuario',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': { description: 'Workspace state', content: { 'application/json': { schema: { type: 'object', properties: { workspace: { $ref: '#/components/schemas/Workspace' }, updatedAt: { type: 'string', format: 'date-time' } } } } } }
        }
      },
      put: {
        tags: ['Workspace'],
        summary: 'Guardar workspace',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['workspace'],
                properties: {
                  workspace: { $ref: '#/components/schemas/Workspace' },
                  changedProjectId: { type: 'string', description: 'Solo sincronizar este proyecto (parcial)' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Workspace guardado', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, updatedAt: { type: 'string', format: 'date-time' } } } } } },
          '400': { description: 'Workspace inválido' }
        }
      }
    },
    '/projects/{projectId}': {
      delete: {
        tags: ['Workspace'],
        summary: 'Eliminar proyecto propio',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Proyecto eliminado' },
          '404': { description: 'No encontrado' }
        }
      }
    },
    '/documents/{projectId}/{documentId}': {
      delete: {
        tags: ['Workspace'],
        summary: 'Eliminar documento propio',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'documentId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Documento eliminado' },
          '404': { description: 'No encontrado' }
        }
      }
    },
    '/projects/{id}/logo': {
      get: {
        tags: ['Workspace'],
        summary: 'Obtener logo de proyecto',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Logo (imagen o redirect)' },
          '404': { description: 'Sin logo' }
        }
      }
    },
    '/projects/{id}/cover': {
      get: {
        tags: ['Workspace'],
        summary: 'Obtener cover de proyecto',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Cover (imagen o redirect)' },
          '404': { description: 'Sin cover' }
        }
      }
    },
    '/templates': {
      get: {
        tags: ['Templates'],
        summary: 'Listar plantillas disponibles',
        responses: {
          '200': { description: 'Plantillas', content: { 'application/json': { schema: { type: 'object', properties: { templates: { type: 'array' } } } } } }
        }
      },
      post: {
        tags: ['Templates'],
        summary: 'Guardar nueva plantilla',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { template: { type: 'object' } } } } }
        },
        responses: { '200': { description: 'Plantilla guardada' } }
      }
    },
    '/integration/status': {
      get: {
        tags: ['Integration'],
        summary: 'Estado de integración con Plane',
        responses: {
          '200': { description: 'Estado actual', content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    },
    '/integration/profiles': {
      get: {
        tags: ['Integration'],
        summary: 'Listar perfiles de integración',
        responses: {
          '200': { description: 'Perfiles disponibles', content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    },
    '/integration/profile': {
      post: {
        tags: ['Integration'],
        summary: 'Aplicar perfil de integración',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { profile: { type: 'string' } } } } }
        },
        responses: { '200': { description: 'Perfil aplicado' } }
      }
    },
    '/plane/projects': {
      get: {
        tags: ['Plane'],
        summary: 'Listar proyectos de Plane',
        parameters: [
          { name: 'schema', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'workspaceId', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Proyectos de Plane', content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    },
    '/plane/projects/{projectId}/issues': {
      get: {
        tags: ['Plane'],
        summary: 'Listar issues de un proyecto Plane',
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'label', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'includeDeleted', in: 'query', schema: { type: 'boolean' } },
          { name: 'includeArchived', in: 'query', schema: { type: 'boolean' } }
        ],
        responses: {
          '200': { description: 'Issues del proyecto', content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    }
  }
};
