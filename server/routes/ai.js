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
    .map(([k, v]) => `- ${k}: ${String(v).slice(0, 400)}`);

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

async function callOpenAI(apiKey, model, systemMessage, userPrompt) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

export function registerAiRoutes(app, { config }) {
  const apiKey = config.openaiApiKey;
  const model   = config.openaiModel;

  // ── Single block generation ──────────────────────────────────────
  app.post('/api/ai/generate', async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: 'IA no configurada. Define OPENAI_API_KEY en el servidor.' });
    }

    const { prompt, context = {} } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'El campo "prompt" es requerido.' });
    }

    try {
      const systemMessage = buildSystemMessage(context);
      const text = await callOpenAI(apiKey, model, systemMessage, prompt.trim());
      return res.json({ text });
    } catch (err) {
      console.error('[ai/generate]', err.message);
      return res.status(502).json({ error: err.message });
    }
  });

  // ── Batch: process all prompts in one request ────────────────────
  app.post('/api/ai/process-all', async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({ error: 'IA no configurada. Define OPENAI_API_KEY en el servidor.' });
    }

    const { blocks } = req.body || {};
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ error: 'Se requiere un arreglo "blocks" no vacío.' });
    }

    // Process blocks sequentially to avoid rate-limit bursts
    const results = [];
    for (const block of blocks) {
      const { id, prompt, context = {} } = block;
      if (!prompt || !prompt.trim()) {
        results.push({ id, text: '', error: 'Prompt vacío, bloque omitido.' });
        continue;
      }
      try {
        const systemMessage = buildSystemMessage(context);
        const text = await callOpenAI(apiKey, model, systemMessage, prompt.trim());
        results.push({ id, text });
      } catch (err) {
        results.push({ id, text: '', error: err.message });
      }
    }

    return res.json({ results });
  });

  // ── Status check ─────────────────────────────────────────────────
  app.get('/api/ai/status', (_req, res) => {
    res.json({ configured: Boolean(apiKey), model });
  });
}
