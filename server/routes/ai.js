import { getAiGuardConfig, normalizeContext, validateBlocks, validatePrompt } from '../services/ai-guards.js';
import { sanitizeRichTextHtml } from '../services/rich-text.js';
import { isTimeoutError } from '../services/request-utils.js';

/**
 * POST /api/ai/generate
 * Body: { prompt: string, context: Record<string, string> }
 * Returns: { text: string }  (HTML string)
 *
 * POST /api/ai/process-all
 * Body: { blocks: Array<{ id, prompt, context }> }
 * Returns: { results: Array<{ id, text, error? }> }
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function buildSystemMessage(context = {}) {
  const lines = Object.entries(context)
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `- ${k}: ${String(v)}`);

  const contextBlock = lines.length
    ? `\n\nContexto del documento (variables disponibles):\n${lines.join('\n')}`
    : '';

  return (
    'Eres un asistente especializado en redacción de expedientes técnicos de ingeniería civil y arquitectura. ' +
    'Redacta el contenido solicitado en español, de forma clara, formal y técnica. ' +
    'Devuelve únicamente el texto redactado en HTML simple (párrafos <p>, listas <ul>/<ol>, negritas <strong>). ' +
    'No incluyas markdown, bloques de código ni explicaciones adicionales.' +
    contextBlock
  );
}

async function callOpenAI(apiKey, model, systemMessage, userPrompt, timeoutMs) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 1500
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
  }

  const data = await response.json();
  return sanitizeRichTextHtml(data.choices?.[0]?.message?.content?.trim() || '');
}

export function registerAiRoutes(app, { config, authRequired, authOptionalInDev, aiRateLimit }) {
  const apiKey = config.openaiApiKey;
  const model = config.openaiModel;
  const openaiTimeoutMs = config.openaiTimeoutMs || 30000;
  const guardConfig = getAiGuardConfig(config);
  const aiAuth = config.aiRequireAuth ? authOptionalInDev : (_req, _res, next) => next();

  // ── Single block generation ──────────────────────────────────────
  app.post('/api/ai/generate', aiAuth, aiRateLimit, async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: 'IA no configurada. Define OPENAI_API_KEY en el servidor.' });
    }

    const { prompt, context = {} } = req.body || {};
    const promptValidation = validatePrompt(prompt, guardConfig);
    if (!promptValidation.ok) {
      return res.status(400).json({ error: promptValidation.error });
    }

    try {
      const systemMessage = buildSystemMessage(normalizeContext(context, guardConfig));
      const text = await callOpenAI(apiKey, model, systemMessage, promptValidation.prompt, openaiTimeoutMs);
      return res.json({ text });
    } catch (err) {
      console.error('[ai/generate]', err.message);
      const status = isTimeoutError(err) ? 504 : 502;
      return res.status(status).json({ error: err.message });
    }
  });

  // ── Batch: process all prompts in one request ────────────────────
  app.post('/api/ai/process-all', aiAuth, aiRateLimit, async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: 'IA no configurada. Define OPENAI_API_KEY en el servidor.' });
    }

    const { blocks } = req.body || {};
    const blocksValidation = validateBlocks(blocks, guardConfig);
    if (!blocksValidation.ok) {
      return res.status(400).json({ error: blocksValidation.error });
    }

    // Process blocks sequentially to avoid rate-limit bursts
    const results = [];
    for (const block of blocks) {
      const { id, prompt, context = {} } = block || {};
      const promptValidation = validatePrompt(prompt, guardConfig);
      if (!promptValidation.ok) {
        results.push({ id, text: '', error: promptValidation.error });
        continue;
      }
      try {
        const systemMessage = buildSystemMessage(normalizeContext(context, guardConfig));
        const text = await callOpenAI(apiKey, model, systemMessage, promptValidation.prompt, openaiTimeoutMs);
        results.push({ id, text });
      } catch (err) {
        results.push({ id, text: '', error: err.message });
      }
    }

    return res.json({ results });
  });


  app.post('/api/ai/generate-diagram', aiAuth, aiRateLimit, async (req, res) => {
    const prompt = String(req.body?.prompt || '').trim();
    const format = String(req.body?.format || 'mermaid').toLowerCase() === 'tikz' ? 'tikz' : 'mermaid';
    const promptValidation = validatePrompt(prompt || 'diagrama de proceso', guardConfig);
    if (!promptValidation.ok) {
      return res.status(400).json({ error: promptValidation.error });
    }

    if (!apiKey) {
      const code = format === 'tikz'
        ? '\\begin{tikzpicture}[node distance=2cm]\\node[draw] (a) {Inicio};\\node[draw,right of=a] (b) {Revision};\\draw[->] (a) -- (b);\\end{tikzpicture}'
        : `flowchart TD\n  A[Inicio] --> B[${promptValidation.prompt.slice(0, 48).replace(/[\\[\\]{}]/g, '') || 'Proceso'}]\n  B --> C[Revision]\n  C --> D[Fin]`;
      return res.json({ code, format });
    }

    try {
      const systemMessage = format === 'tikz'
        ? 'Devuelve solo codigo TikZ compilable, sin markdown ni explicaciones.'
        : 'Devuelve solo codigo Mermaid valido, sin markdown ni explicaciones. Usa flowchart TD salvo que el usuario pida otro tipo.';
      const code = await callOpenAI(apiKey, model, systemMessage, promptValidation.prompt, openaiTimeoutMs);
      return res.json({ code: String(code || '').replace(/<[^>]+>/g, '').trim(), format });
    } catch (err) {
      console.error('[ai/generate-diagram]', err.message);
      const status = isTimeoutError(err) ? 504 : 502;
      return res.status(status).json({ error: err.message });
    }
  });

  // ── Status check ─────────────────────────────────────────────────
  app.get('/api/ai/status', (_req, res) => {
    res.json({ configured: Boolean(apiKey), model });
  });
}
