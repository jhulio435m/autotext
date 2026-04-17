import { clearSessionToken, getSessionToken, notifyAuthExpired } from './session';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const responseCache = new Map();

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getSessionToken();
  const needsAuth = options.auth !== false;
  const cacheKey = options.cacheKey || null;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const cached = cacheKey ? responseCache.get(cacheKey) : null;
  if (cached?.etag) {
    headers['If-None-Match'] = cached.etag;
  }

  if (needsAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 304 && cached) {
    return cached.data;
  }

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const message = data?.error || 'Error de API';
    if (response.status === 401 && options.auth !== false) {
      clearSessionToken();
      notifyAuthExpired({ path, message, status: response.status });
    }
    throw new Error(message);
  }

  if (cacheKey && response.ok) {
    const etag = response.headers.get('etag');
    responseCache.set(cacheKey, {
      etag,
      data
    });
  }

  return data;
}

async function requestBlob(path, options = {}) {
  const token = getSessionToken();
  const needsAuth = options.auth !== false;

  const headers = {
    ...(options.headers || {})
  };

  if (needsAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const data = await parseJsonSafe(response);
    if (response.status === 401 && options.auth !== false) {
      clearSessionToken();
      notifyAuthExpired({ path, message: data?.error || 'Error de API', status: response.status });
    }
    throw new Error(data?.error || 'Error de API');
  }

  return response.blob();
}

export function apiLogin(payload) {
  return request('/auth/login', { method: 'POST', body: payload, auth: false });
}

export function apiGetWorkspace() {
  return request('/workspace', { cacheKey: 'workspace' });
}

export function apiSaveWorkspace(workspace, changedProjectId = null) {
  return request('/workspace', { method: 'PUT', body: { workspace, changedProjectId } }).then((data) => {
    responseCache.delete('workspace');
    if (changedProjectId && workspace?.documents && typeof workspace.documents === 'object') {
      const docs = workspace.documents[changedProjectId] || [];
      docs.forEach((doc) => {
        if (doc?.id) responseCache.delete(`document:${changedProjectId}:${doc.id}`);
      });
    }
    return data;
  });
}

export function apiGetDocument(projectId, documentId) {
  return request(`/projects/${projectId}/documents/${documentId}`, {
    cacheKey: `document:${projectId}:${documentId}`
  });
}

export function apiGetPlaneProjects(params = {}) {
  const query = new URLSearchParams();
  if (params.schema) query.set('schema', params.schema);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.workspaceId) query.set('workspaceId', params.workspaceId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request(`/plane/projects${suffix}`, { auth: false });
}

export function apiGetPlaneProjectIssues(projectId, params = {}) {
  const query = new URLSearchParams();
  if (params.label) query.set('label', params.label);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.includeDeleted) query.set('includeDeleted', String(params.includeDeleted));
  if (params.includeArchived) query.set('includeArchived', String(params.includeArchived));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return request(`/plane/projects/${projectId}/issues${suffix}`, { auth: false });
}

export function apiGetIntegrationStatus() {
  return request('/integration/status', { auth: false });
}

export function apiGetIntegrationProfiles() {
  return request('/integration/profiles', { auth: false });
}

export function apiApplyIntegrationProfile(profile) {
  return request('/integration/profile', {
    method: 'POST',
    auth: false,
    body: { profile }
  });
}

export function apiGetDocumentLock(projectId, documentId) {
  return request(`/documents/${projectId}/${documentId}/lock`);
}

export function apiAcquireDocumentLock(projectId, documentId, token) {
  return request(`/documents/${projectId}/${documentId}/lock`, {
    method: 'POST',
    body: { token }
  });
}

export function apiHeartbeatDocumentLock(projectId, documentId, token) {
  return request(`/documents/${projectId}/${documentId}/lock/heartbeat`, {
    method: 'POST',
    body: { token }
  });
}

export function apiReleaseDocumentLock(projectId, documentId, token) {
  return request(`/documents/${projectId}/${documentId}/lock`, {
    method: 'DELETE',
    body: { token }
  });
}

export function apiExportDocumentTex(document) {
  return requestBlob('/documents/export/tex', {
    method: 'POST',
    body: { document },
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export function apiExportDocumentPdf(document) {
  return requestBlob('/documents/export/pdf', {
    method: 'POST',
    body: { document },
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export function apiListTemplates() {
  return request('/templates');
}

export function apiSaveTemplate(template) {
  return request('/templates', {
    method: 'POST',
    body: { template }
  });
}

/**
 * Send a prompt to the AI and get back generated HTML text.
 * @param {string} prompt  - The user instruction
 * @param {Object} context - Key/value map of all document variables (interpolated)
 */
export function apiGenerateText(prompt, context = {}) {
  return request('/ai/generate', {
    method: 'POST',
    body: { prompt, context }
  });
}
