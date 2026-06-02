import { Suspense, lazy } from 'react';

const TableEditor = lazy(() => import('../TableEditor'));

function TableEditorFallback() {
  return (
    <div className='rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500'>
      Cargando editor de tabla...
    </div>
  );
}

export default function LazyTableEditor(props) {
  return (
    <Suspense fallback={<TableEditorFallback />}>
      <TableEditor {...props} />
    </Suspense>
  );
}
