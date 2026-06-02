import { Suspense, lazy } from 'react';

const RichTextEditor = lazy(() => import('./RichTextEditor'));

function EditorFallback() {
  return (
    <div className='rounded-sm border border-slate-200 bg-white'>
      <div className='border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500'>
        Cargando editor...
      </div>
      <div className='min-h-[80px] px-3 py-3 text-sm text-slate-400'>
        Preparando herramientas de edición enriquecida.
      </div>
    </div>
  );
}

export default function LazyRichTextEditor(props) {
  return (
    <Suspense fallback={<EditorFallback />}>
      <RichTextEditor {...props} />
    </Suspense>
  );
}
