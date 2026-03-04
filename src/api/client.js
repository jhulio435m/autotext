import { getSessionToken } from './session';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

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

  const headers = {
    'Content-Type': 'application/json',
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

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const message = data?.error || 'Error de API';
    throw new Error(message);
  }

  return data;
}

export function apiLogin(payload) {
  return request('/auth/login', { method: 'POST', body: payload, auth: false });
}

export function apiGetWorkspace() {
  return request('/workspace');
}

export function apiSaveWorkspace(workspace) {
  return request('/workspace', { method: 'PUT', body: { workspace } });
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
