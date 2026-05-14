import { isUuid } from '../services/request-utils.js';

export function canUsePlaneApi(config) {
  return Boolean(config.planeBaseUrl && config.planeWorkspaceSlug && config.planeApiKey);
}

export function getPlaneApiHeaders(config) {
  return {
    Accept: 'application/json',
    'X-API-Key': config.planeApiKey
  };
}

export async function fetchPlaneApiJson(config, pathname, query = {}) {
  const endpoint = new URL(pathname, `${config.planeBaseUrl || ''}/`);

  Object.entries(query).forEach(([key, value]) => {
    if (value == null || value === '') return;
    endpoint.searchParams.set(key, String(value));
  });

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: getPlaneApiHeaders(config),
    signal: AbortSignal.timeout(Math.max(1000, config.planeApiTimeoutMs || 10000))
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = body?.error || body?.detail || `Plane API responded with ${response.status}`;
    throw new Error(message);
  }

  return body;
}

export async function fetchWithSafeRedirects(config, initialUrl, maxRedirects = 5) {
  let currentUrl = initialUrl;

  const getPlaneProtocol = (cfg) => {
    try {
      if (!cfg.planeBaseUrl) return 'http:';
      const parsed = new URL(cfg.planeBaseUrl);
      return parsed.protocol || 'http:';
    } catch {
      return 'http:';
    }
  };

  const applyPreferredProtocol = (cfg, urlString) => {
    const preferred = getPlaneProtocol(cfg);
    if (!preferred) return urlString;
    try {
      const parsed = new URL(urlString);
      parsed.protocol = preferred;
      return parsed.toString();
    } catch {
      return urlString;
    }
  };

  for (let index = 0; index <= maxRedirects; index += 1) {
    const response = await fetch(currentUrl, { redirect: 'manual' });
    const status = response.status || 0;
    const isRedirect = status >= 300 && status < 400;

    if (!isRedirect) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) return response;

    const nextUrl = new URL(location, currentUrl).toString();
    currentUrl = applyPreferredProtocol(config, nextUrl);
  }

  throw new Error('Demasiadas redirecciones al resolver asset de Plane.');
}

export async function fetchAssetAsBase64(url, config) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:image')) return url;

  try {
    const fetchOptions = {
      signal: AbortSignal.timeout(10000),
      redirect: 'follow'
    };
    if (config?.planeApiKey) {
      fetchOptions.headers = { 'X-API-Key': config.planeApiKey };
    }

    const res = await fetch(url, fetchOptions);
    if (!res.ok) return '';
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.error(`[PLANE_CLIENT_ERROR] Failed to fetch ${url}:`, err.message);
    return '';
  }
}
