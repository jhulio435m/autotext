import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { VariableExtension } from './VariableExtension';
import Mention from '@tiptap/extension-mention';
import { getVariableMentionSuggestions } from './VariableMention';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Code,
  Sparkles,
  X,
  CornerDownLeft
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import useDocumentStore from '../../store';
import { apiGenerateText } from '../../api/client';
import { sanitizeRichTextHtml } from '../../utils/richText';

/* ── Toolbar ─────────────────────────────────────────────────── */
const MenuBar = ({ editor, aiOpen, onToggleAi }) => {
  if (!editor) return null;

  const buttons = [
    { icon: Bold,        title: 'Negrita',        action: () => editor.chain().focus().toggleBold().run(),              isActive: editor.isActive('bold') },
    { icon: Italic,      title: 'Cursiva',         action: () => editor.chain().focus().toggleItalic().run(),            isActive: editor.isActive('italic') },
    { type: 'divider' },
    { icon: List,        title: 'Lista',           action: () => editor.chain().focus().toggleBulletList().run(),        isActive: editor.isActive('bulletList') },
    { icon: ListOrdered, title: 'Lista numerada',  action: () => editor.chain().focus().toggleOrderedList().run(),       isActive: editor.isActive('orderedList') },
    { icon: Quote,       title: 'Cita',            action: () => editor.chain().focus().toggleBlockquote().run(),        isActive: editor.isActive('blockquote') },
    { icon: Code,        title: 'Código',          action: () => editor.chain().focus().toggleCodeBlock().run(),         isActive: editor.isActive('codeBlock') },
    { type: 'divider' },
    { icon: Undo,        title: 'Deshacer',        action: () => editor.chain().focus().undo().run(),                   disabled: !editor.can().undo() },
    { icon: Redo,        title: 'Rehacer',         action: () => editor.chain().focus().redo().run(),                   disabled: !editor.can().redo() },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-1 border-b border-slate-200 bg-slate-50">
      {buttons.map((btn, index) => {
        if (btn.type === 'divider') return <div key={index} className="w-px h-4 bg-slate-300 mx-0.5" />;
        const Icon = btn.icon;
        return (
          <button
            key={index}
            type="button"
            title={btn.title}
            onClick={btn.action}
            disabled={btn.disabled}
            className={`p-1.5 rounded transition ${
              btn.isActive ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            } ${btn.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      {/* AI toggle button — always rightmost */}
      <div className="ml-auto">
        <button
          type="button"
          title={aiOpen ? 'Cerrar asistente IA' : 'Asistente IA'}
          onClick={onToggleAi}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${
            aiOpen
              ? 'bg-violet-100 text-violet-700 border border-violet-200'
              : 'text-slate-500 hover:bg-violet-50 hover:text-violet-600 border border-transparent'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          IA
        </button>
      </div>
    </div>
  );
};

/* ── AI Panel ─────────────────────────────────────────────────── */
function AiPanel({ editor, onClose, savedPrompt = '', onSavePrompt }) {
  const [prompt, setPrompt] = useState(savedPrompt);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  const formData = useDocumentStore((s) => s.formData);
  const structure = useDocumentStore((s) => s.structure);

  // Build a flat key→value context from all variables in the document
  const buildContext = () => {
    const ctx = {};
    // Walk structure to collect variable blocks
    const walk = (nodes) => {
      (nodes || []).forEach((node) => {
        if (node?.isStructure) { walk(node.children || []); return; }
        if (node?.type === 'variable' && node.variableKey) {
          ctx[node.variableKey] = formData[node.id] ?? '';
        }
        // Also include all formData values for any other block types (rich text, etc.)
        if (node?.id && formData[node.id] !== undefined) {
          const key = node.variableKey || node.label || node.id;
          if (!ctx[key]) ctx[key] = formData[node.id];
        }
      });
    };
    walk(structure);
    // Merge raw formData as fallback
    Object.entries(formData).forEach(([k, v]) => {
      if (!ctx[k] && typeof v === 'string') ctx[k] = v;
    });
    return ctx;
  };

  const handleSave = () => {
    if (!onSavePrompt) return;
    onSavePrompt(prompt);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    try {
      const context = buildContext();
      const result = await apiGenerateText(prompt.trim(), context);
      if (result?.text) {
        // Insert the AI result — replace editor content
        editor.chain().focus().setContent(sanitizeRichTextHtml(result.text)).run();
        onClose();
      } else {
        setError('La IA no devolvió contenido. Intenta con otro prompt.');
      }
    } catch (err) {
      setError(err?.message || 'Error al conectar con la IA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="border-t border-violet-100 bg-violet-50/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">Asistente IA</span>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleGenerate();
          }
        }}
        placeholder="Redacta una descripción técnica sobre el alcance del proyecto, considerando el contexto de las variables del documento…"
        className="w-full resize-none rounded-md border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
      />

      {error && (
        <p className="text-xs text-rose-600 rounded-md bg-rose-50 border border-rose-200 px-2 py-1.5">{error}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-slate-400">
          Variables del documento disponibles.{' '}
          <kbd className="px-1 rounded border border-slate-200 bg-white text-[9px]">Ctrl+Enter</kbd> procesa.
        </p>
        <div className="flex items-center gap-1.5">
          {onSavePrompt && (
            <button
              type="button"
              disabled={!prompt.trim()}
              onClick={handleSave}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                saved
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {saved ? '✓ Guardado' : 'Guardar'}
            </button>
          )}
          <button
            type="button"
            disabled={loading || !prompt.trim()}
            onClick={handleGenerate}
            className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CornerDownLeft className="w-3 h-3" />
            )}
            {loading ? 'Procesando…' : 'Procesar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function RichTextEditor({ value, onChange, placeholder, savedPrompt, onSavePrompt }) {
  const [aiOpen, setAiOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: placeholder || 'Escribe algo aquí… o usa IA ✨' }),
      VariableExtension,
      Mention.configure({
        HTMLAttributes: { class: 'text-sky-600 bg-sky-50 rounded px-1' },
        suggestion: getVariableMentionSuggestions(),
      }),
    ],
    content: sanitizeRichTextHtml(value),
    onUpdate: ({ editor }) => {
      onChange(sanitizeRichTextHtml(editor.getHTML()));
    },
    editorProps: {
      attributes: { class: 'prose prose-sm prose-slate max-w-none p-3 min-h-[80px] outline-none' },
    },
  });

  useEffect(() => {
    const sanitizedValue = sanitizeRichTextHtml(value);
    if (editor && sanitizedValue !== editor.getHTML()) {
      editor.commands.setContent(sanitizedValue);
    }
  }, [value, editor]);

  return (
    <div className="border border-slate-200 overflow-hidden bg-white focus-within:border-sky-300 focus-within:ring-1 focus-within:ring-sky-100 transition rounded-sm">
      <MenuBar editor={editor} aiOpen={aiOpen} onToggleAi={() => setAiOpen((v) => !v)} />
      <EditorContent editor={editor} />
      {aiOpen && (
        <AiPanel
          editor={editor}
          onClose={() => setAiOpen(false)}
          savedPrompt={savedPrompt || ''}
          onSavePrompt={onSavePrompt}
        />
      )}
    </div>
  );
}
