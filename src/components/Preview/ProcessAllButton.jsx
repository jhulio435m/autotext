import { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import useDocumentStore from '../../store';
import { apiGenerateText } from '../../api/client';
import { sanitizeRichTextHtml, wrapPlainTextAsRichText } from '../../utils/richText';

/**
 * Collects all blocks in the document that have a promptIA or promptTemplate,
 * calls the AI for each, and writes the results back to formData.
 */
export function useProcessAllPrompts() {
  const structure   = useDocumentStore((s) => s.structure);
  const formData    = useDocumentStore((s) => s.formData);
  const updateFormData = useDocumentStore((s) => s.updateFormData);

  // Build flat variable context from all variable blocks
  const buildContext = () => {
    const ctx = {};
    const walk = (nodes) => {
      (nodes || []).forEach((node) => {
        if (node?.isStructure) { walk(node.children || []); return; }
        if (node?.type === 'variable' && node.variableKey) {
          ctx[node.variableKey] = formData[node.id] ?? '';
        }
      });
    };
    walk(structure);
    return ctx;
  };

  // Collect blocks that have a prompt defined and no existing content
  const collectPromptBlocks = () => {
    const blocks = [];
    const walk = (nodes) => {
      (nodes || []).forEach((node) => {
        if (node?.isStructure) { walk(node.children || []); return; }
        const prompt = node.promptIA || node.promptTemplate || '';
        if (prompt.trim()) {
          blocks.push({ id: node.id, prompt: prompt.trim(), label: node.label || node.id });
        }
      });
    };
    walk(structure);
    return blocks;
  };

  const processAll = async ({ onlyEmpty = false } = {}) => {
    const context = buildContext();
    const blocks = collectPromptBlocks().filter((b) => {
      if (!onlyEmpty) return true;
      const current = formData[b.id];
      return !current || current === '' || current === '<p></p>';
    });

    if (!blocks.length) return { processed: 0, errors: [] };

    const errors = [];
    for (const block of blocks) {
      try {
        const result = await apiGenerateText(block.prompt, context);
        if (result?.text) {
          updateFormData(block.id, sanitizeRichTextHtml(result.text) || wrapPlainTextAsRichText(result.text));
        }
      } catch (err) {
        errors.push({ id: block.id, label: block.label, error: err.message });
      }
    }

    return { processed: blocks.length - errors.length, errors };
  };

  return { processAll, collectPromptBlocks };
}

/* ─── Button component ──────────────────────────────────────────────────────── */
export default function ProcessAllButton({ compact = false }) {
  const [state, setState]   = useState('idle'); // idle | loading | done | error
  const [summary, setSummary] = useState('');
  const { processAll, collectPromptBlocks } = useProcessAllPrompts();

  // Reset status pill after a few seconds
  useEffect(() => {
    if (state === 'done' || state === 'error') {
      const t = setTimeout(() => setState('idle'), 4000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const pendingCount = collectPromptBlocks().length;

  const handleClick = async () => {
    if (state === 'loading') return;
    setState('loading');
    try {
      const { processed, errors } = await processAll();
      if (errors.length) {
        setSummary(`${processed} ok, ${errors.length} con error`);
        setState('error');
      } else {
        setSummary(`${processed} bloque${processed !== 1 ? 's' : ''} procesado${processed !== 1 ? 's' : ''}`);
        setState('done');
      }
    } catch (err) {
      setSummary(err.message || 'Error');
      setState('error');
    }
  };

  if (pendingCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {state === 'done' && (
        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> {summary}
        </span>
      )}
      {state === 'error' && (
        <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5" /> {summary}
        </span>
      )}
      <button
        type="button"
        disabled={state === 'loading'}
        onClick={handleClick}
        className={`flex items-center gap-1.5 rounded-md border font-semibold transition
          ${state === 'loading'
            ? 'border-violet-300 bg-violet-50 text-violet-400 cursor-wait'
            : 'border-violet-500 bg-violet-600 text-white hover:bg-violet-700 hover:border-violet-700'}
          ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
      >
        {state === 'loading' ? (
          <span className="inline-block w-3 h-3 border-2 border-violet-300 border-t-white rounded-full animate-spin" />
        ) : (
          <Sparkles className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        )}
        {state === 'loading' ? 'Procesando…' : `Procesar IA (${pendingCount})`}
      </button>
    </div>
  );
}
