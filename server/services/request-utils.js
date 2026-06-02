export function isSafeIdentifier(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value || '');
}

export function quoteIdentifier(value) {
  if (!isSafeIdentifier(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

export function clampLimit(rawLimit, fallback) {
  const value = Number(rawLimit);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(1000, Math.trunc(value)));
}

export function parseBooleanQuery(value) {
  if (value == null) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function isDbConnectivityError(error) {
  const code = String(error?.code || '').toUpperCase();
  return ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH', 'EPERM'].includes(code);
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  );
}


export function isTimeoutError(error) {
  const code = String(error?.code || '').toUpperCase();
  const name = String(error?.name || '');
  const message = String(error?.message || '').toLowerCase();

  return [
    'ETIMEDOUT',
    'ABORT_ERR',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT'
  ].includes(code)
    || ['AbortError', 'TimeoutError'].includes(name)
    || message.includes('timed out')
    || message.includes('timeout');
}
