function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function truncateString(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

export function getAiGuardConfig(config) {
  return {
    maxPromptChars: clampInteger(config.aiMaxPromptChars, 4000, 100, 20000),
    maxContextEntries: clampInteger(config.aiMaxContextEntries, 30, 1, 200),
    maxContextValueChars: clampInteger(config.aiMaxContextValueChars, 400, 20, 4000),
    maxBlocksPerRequest: clampInteger(config.aiMaxBlocksPerRequest, 20, 1, 200)
  };
}

export function normalizeContext(context, guardConfig) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return {};

  const entries = Object.entries(context)
    .slice(0, guardConfig.maxContextEntries)
    .map(([key, value]) => [truncateString(key, 120), truncateString(value, guardConfig.maxContextValueChars)])
    .filter(([key, value]) => key.trim() && value.trim());

  return Object.fromEntries(entries);
}

export function validatePrompt(prompt, guardConfig) {
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return { ok: false, error: 'El campo "prompt" es requerido.' };
  }

  if (prompt.length > guardConfig.maxPromptChars) {
    return {
      ok: false,
      error: `El prompt excede el máximo permitido de ${guardConfig.maxPromptChars} caracteres.`
    };
  }

  return { ok: true, prompt: prompt.trim() };
}

export function validateBlocks(blocks, guardConfig) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { ok: false, error: 'Se requiere un arreglo "blocks" no vacío.' };
  }

  if (blocks.length > guardConfig.maxBlocksPerRequest) {
    return {
      ok: false,
      error: `Se excedió el máximo de ${guardConfig.maxBlocksPerRequest} bloques por solicitud.`
    };
  }

  return { ok: true };
}
