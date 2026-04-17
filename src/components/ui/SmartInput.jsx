import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { VariableExtension } from './VariableExtension';
import { getVariableMentionSuggestions } from './VariableMention';
import { useEffect, useRef } from 'react';

/**
 * Converts a plain string like "Hola {{nombre}}" into TipTap HTML
 * like "<p>Hola <span data-type='variable' id='nombre'></span></p>"
 */
function textToHTML(text) {
  if (!text) return '<p></p>';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  // Find all {{key}} and replace with TipTap's variable span format
  const withVars = escaped.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, '<span data-type="variable" id="$1"></span>');
  return `<p>${withVars}</p>`;
}

/**
 * Converts a TipTap JSON document back to a plain string with {{key}} variables.
 */
function jsonToText(doc) {
  if (!doc || !doc.content) return '';
  let result = '';

  const walk = (nodes) => {
    (nodes || []).forEach((node) => {
      // If we encounter a variable node, append {{id}}
      if (node.type === 'variable') {
        result += `{{${node.attrs?.id}}}`;
      }
      // If we encounter a text node, simply append text
      else if (node.type === 'text') {
        result += node.text;
      }
      // If we encounter a hard break (Shift+Enter), append \n
      else if (node.type === 'hardBreak') {
        result += '\n';
      }
      // If we encounter a new paragraph (and it's not the very first thing), append \n
      else if (node.type === 'paragraph') {
        if (result.length > 0 && !result.endsWith('\n')) {
          result += '\n';
        }
        walk(node.content);
      } else {
        // Recurse into other nodes
        walk(node.content);
      }
    });
  };

  walk(doc.content);
  return result;
}

export default function SmartInput({
  value = '',
  onChange,
  multiline = false,
  rows = 2,
  placeholder,
  className = '',
}) {
  // A ref to track the last emmited plain text value so we don't cause infinite render loops
  const lastEmittedValue = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bold: false,
        italic: false,
        strike: false,
      }),
      Placeholder.configure({ placeholder: placeholder || '' }),
      VariableExtension,
      Mention.configure({
        HTMLAttributes: { class: 'text-sky-600 bg-sky-50 rounded px-1' },
        suggestion: getVariableMentionSuggestions(),
      }),
    ],
    content: textToHTML(value),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      let plain = jsonToText(json);
      
      // If not multiline, strip newlines
      if (!multiline) {
        plain = plain.replace(/\ng/, '');
      }

      if (plain !== lastEmittedValue.current) {
        lastEmittedValue.current = plain;
        onChange(plain);
      }
    },
    editorProps: {
      attributes: {
        // This makes it visually match the normal inputs
        class: `w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] outline-none transition focus-within:border-sky-300 focus-within:ring-1 focus-within:ring-sky-100 ${
          multiline ? '' : 'truncate break-words whitespace-pre-wrap flex items-center overflow-x-auto min-h-[34px] resize-none'
        } ${className}`,
      },
      // Block standard Enter if single line
      handleKeyDown: (view, event) => {
        if (!multiline && event.key === 'Enter') {
          event.preventDefault();
          return true;
        }
        return false;
      }
    },
  });

  // If external value changes (e.g. user selected another block), sync editor
  useEffect(() => {
    if (editor && value !== lastEmittedValue.current) {
      lastEmittedValue.current = value;
      // We must remember cursor position if we are replacing content, but usually this is for block switching.
      editor.commands.setContent(textToHTML(value));
    }
  }, [value, editor]);

  const minH = multiline ? `${Math.max(2, rows) * 1.5 + 1.2}rem` : 'auto';

  // For multi-line textareas, adjust height via inline block style constraints
  return (
    <div 
      className={`smart-input-container ${multiline ? 'multiline-smart-input' : ''} [&>.tiptap>p.is-editor-empty:first-child::before]:text-slate-400 [&>.tiptap>p.is-editor-empty:first-child::before]:float-left [&>.tiptap>p.is-editor-empty:first-child::before]:h-0 [&>.tiptap>p.is-editor-empty:first-child::before]:pointer-events-none`}
      style={multiline ? { minHeight: minH } : {}}
      onKeyDown={(e) => {
        // Let the editor handle typing, but bubble up other keys properly if necessary
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .smart-input-container .tiptap p { margin: 0; }
        .multiline-smart-input .tiptap { display: block; overflow-y: auto; height: 100%; min-height: ${minH}; }
      `}} />
      <EditorContent editor={editor} />
    </div>
  );
}
