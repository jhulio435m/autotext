import { EyeOff, Eye } from 'lucide-react';

function findNode(nodes, id) {
  for (const node of nodes || []) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function Section({ title, children }) {
  return (
    <section className='border-b border-slate-100 px-3 py-3'>
      <h4 className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>{title}</h4>
      <div className='mt-2.5 space-y-2.5'>{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className='mb-1 block text-[11px] font-medium text-slate-500'>{label}</label>
      {children}
    </div>
  );
}

/**
 * FieldToggle — a field whose visibility is controlled by an eye button next to its label.
 * Props:
 *   label     — text shown as the field label
 *   enabled   — boolean: whether the field (and its content) is visible in the output
 *   onToggle  — callback to toggle enabled
 *   children  — the actual input element for this field
 */
function FieldToggle({ label, enabled, onToggle, children }) {
  return (
    <div>
      <div className='mb-1 flex items-center justify-between'>
        <span className={`text-[11px] font-medium transition ${enabled ? 'text-slate-500' : 'text-slate-300'}`}>
          {label}
        </span>
        <button
          type='button'
          title={enabled ? 'Ocultar en la exportación' : 'Mostrar en la exportación'}
          onClick={onToggle}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition
            ${enabled
              ? 'bg-sky-50 text-sky-600 hover:bg-sky-100'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
        >
          {enabled
            ? <><Eye className='h-3 w-3' /> visible</>
            : <><EyeOff className='h-3 w-3' /> oculto</>}
        </button>
      </div>
      {enabled && children}
    </div>
  );
}

function inputCls() {
  return 'w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-200';
}

export { findNode, Section, Field, FieldToggle, inputCls };
