import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle, History, MessageSquare, Plus, RotateCcw } from 'lucide-react';
import useDocumentStore from '../store';
import { appendCitationToHtml, diffText, findCitationKeys, parseBibTeX, serializeBibTeX, summarizeDocumentForDiff } from '../utils/documentTools';

function getDoc(state) {
  return (state.documents[state.currentProjectId] || []).find((item) => item.id === state.currentDocumentId) || null;
}

function ToolButton({ active, children, onClick }) {
  return <button type='button' onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold ${active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{children}</button>;
}

function BibliographyTab({ doc, updateDocumentCover }) {
  const currentProjectId = useDocumentStore((s) => s.currentProjectId);
  const currentDocumentId = useDocumentStore((s) => s.currentDocumentId);
  const selectedId = useDocumentStore((s) => s.selectedId);
  const formData = useDocumentStore((s) => s.formData);
  const structure = useDocumentStore((s) => s.structure);
  const updateFormData = useDocumentStore((s) => s.updateFormData);
  const [bibInput, setBibInput] = useState('');
  const entries = doc?.coverData?.__bibliography || [];
  const citationKeys = useMemo(() => findCitationKeys(structure, formData), [structure, formData]);
  const missing = citationKeys.filter((key) => !entries.some((entry) => (entry.key || entry.id) === key));

  const saveEntries = (nextEntries) => updateDocumentCover(currentProjectId, currentDocumentId, { __bibliography: nextEntries });
  const importBib = () => {
    const parsed = parseBibTeX(bibInput);
    if (!parsed.length) return;
    const byKey = new Map(entries.map((entry) => [entry.key || entry.id, entry]));
    parsed.forEach((entry) => byKey.set(entry.key, entry));
    saveEntries([...byKey.values()]);
    setBibInput('');
  };
  const addManual = () => {
    const key = `ref${new Date().getFullYear()}${entries.length + 1}`;
    saveEntries([{ id: key, key, type: 'misc', title: 'Nueva referencia', author: '', year: String(new Date().getFullYear()) }, ...entries]);
  };
  const updateEntry = (key, patch) => saveEntries(entries.map((entry) => (entry.key || entry.id) === key ? { ...entry, ...patch } : entry));
  const removeEntry = (key) => saveEntries(entries.filter((entry) => (entry.key || entry.id) !== key));
  const insertCitation = (key) => {
    if (!selectedId) return;
    updateFormData(selectedId, appendCitationToHtml(formData[selectedId], key));
  };

  return (
    <div className='space-y-3'>
      <div className='rounded-md border border-slate-200 bg-slate-50 p-2'>
        <textarea value={bibInput} onChange={(event) => setBibInput(event.target.value)} rows={4} placeholder='Pega aqui contenido .bib' className='w-full rounded border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-sky-300' />
        <div className='mt-2 flex flex-wrap gap-2'>
          <button type='button' onClick={importBib} className='rounded-md bg-sky-700 px-2.5 py-1.5 text-xs font-semibold text-white'>Importar .bib</button>
          <button type='button' onClick={addManual} className='rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700'>Agregar manual</button>
        </div>
      </div>
      {missing.length ? <p className='rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800'>Citas sin referencia: {missing.join(', ')}</p> : null}
      <a download='referencias.bib' href={`data:text/plain;charset=utf-8,${encodeURIComponent(serializeBibTeX(entries))}`} className='block text-xs font-semibold text-sky-700'>Exportar BibTeX</a>
      <div className='space-y-2'>
        {entries.map((entry) => {
          const key = entry.key || entry.id;
          return (
            <article key={key} className='rounded-md border border-slate-200 bg-white p-2'>
              <div className='flex items-start justify-between gap-2'>
                <input value={entry.title || ''} onChange={(event) => updateEntry(key, { title: event.target.value })} className='min-w-0 flex-1 rounded border border-transparent px-1 text-sm font-semibold text-slate-800 outline-none hover:border-slate-200' />
                <button type='button' onClick={() => removeEntry(key)} className='text-xs font-semibold text-rose-600'>Quitar</button>
              </div>
              <div className='mt-2 grid grid-cols-2 gap-2'>
                <input value={entry.key || ''} onChange={(event) => updateEntry(key, { key: event.target.value, id: event.target.value })} className='rounded border border-slate-200 px-2 py-1 text-xs' />
                <input value={entry.year || ''} onChange={(event) => updateEntry(key, { year: event.target.value })} className='rounded border border-slate-200 px-2 py-1 text-xs' />
              </div>
              <input value={entry.author || ''} onChange={(event) => updateEntry(key, { author: event.target.value })} placeholder='Autor' className='mt-2 w-full rounded border border-slate-200 px-2 py-1 text-xs' />
              <button type='button' onClick={() => insertCitation(entry.key || entry.id)} className='mt-2 rounded-md border border-sky-200 px-2 py-1 text-xs font-semibold text-sky-700 disabled:opacity-40' disabled={!selectedId}>Insertar cita</button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CommentsTab({ doc, updateDocumentCover }) {
  const currentProjectId = useDocumentStore((s) => s.currentProjectId);
  const currentDocumentId = useDocumentStore((s) => s.currentDocumentId);
  const selectedId = useDocumentStore((s) => s.selectedId);
  const currentUser = useDocumentStore((s) => s.currentUser);
  const [text, setText] = useState('');
  const comments = doc?.coverData?.__comments || [];
  const saveComments = (next) => updateDocumentCover(currentProjectId, currentDocumentId, { __comments: next });
  const addComment = () => {
    if (!text.trim() || !selectedId) return;
    const next = [{ id: `c_${Date.now()}`, nodeId: selectedId, text: text.trim(), author: currentUser?.name || currentUser?.email || 'Usuario', createdAt: new Date().toISOString(), resolved: false }, ...comments];
    saveComments(next);
    setText('');
    if ('BroadcastChannel' in window) new BroadcastChannel(`autotext-doc-${currentDocumentId}`).postMessage({ type: 'comment-added', comment: next[0] });
  };
  return (
    <div className='space-y-3'>
      <div className='rounded-md border border-slate-200 bg-slate-50 p-2'>
        <p className='text-xs font-semibold text-slate-600'>Bloque seleccionado: {selectedId || 'ninguno'}</p>
        <textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder='Escribe un comentario para el bloque seleccionado' className='mt-2 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-300' />
        <button type='button' onClick={addComment} disabled={!selectedId || !text.trim()} className='mt-2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white disabled:bg-slate-300'>Comentar</button>
      </div>
      {comments.map((comment) => (
        <article key={comment.id} className={`rounded-md border p-2 ${comment.resolved ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
          <div className='flex items-start justify-between gap-2'>
            <p className='text-xs font-semibold text-slate-500'>{comment.author} · {comment.nodeId}</p>
            <button type='button' onClick={() => saveComments(comments.map((item) => item.id === comment.id ? { ...item, resolved: !item.resolved } : item))} className='text-xs font-semibold text-emerald-700'>{comment.resolved ? 'Reabrir' : 'Resolver'}</button>
          </div>
          <p className='mt-1 text-sm text-slate-800'>{comment.text}</p>
        </article>
      ))}
    </div>
  );
}

function HistoryTab({ doc }) {
  const currentProjectId = useDocumentStore((s) => s.currentProjectId);
  const currentDocumentId = useDocumentStore((s) => s.currentDocumentId);
  const commitDocumentVersionSnapshot = useDocumentStore((s) => s.commitDocumentVersionSnapshot);
  const restoreDocumentVersion = useDocumentStore((s) => s.restoreDocumentVersion);
  const [label, setLabel] = useState('Version para revision');
  const [compareId, setCompareId] = useState('');
  const snapshots = doc?.versionHistory || [];
  const selected = snapshots.find((item) => item.id === compareId) || snapshots[0];
  const diff = selected ? diffText(summarizeDocumentForDiff(selected), summarizeDocumentForDiff(doc)) : [];
  return (
    <div className='space-y-3'>
      <div className='rounded-md border border-slate-200 bg-slate-50 p-2'>
        <input value={label} onChange={(event) => setLabel(event.target.value)} className='w-full rounded border border-slate-200 px-2 py-1.5 text-sm' />
        <button type='button' onClick={() => commitDocumentVersionSnapshot(currentProjectId, currentDocumentId, label || 'Version manual')} className='mt-2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white'>Crear version</button>
      </div>
      <div className='space-y-2'>
        {snapshots.map((snapshot) => (
          <article key={snapshot.id} className='rounded-md border border-slate-200 bg-white p-2'>
            <div className='flex items-start justify-between gap-2'>
              <button type='button' onClick={() => setCompareId(snapshot.id)} className='min-w-0 text-left text-sm font-semibold text-slate-800'>{snapshot.label}</button>
              <button type='button' onClick={() => restoreDocumentVersion(currentProjectId, currentDocumentId, snapshot.id)} className='inline-flex items-center gap-1 text-xs font-semibold text-sky-700'><RotateCcw className='h-3 w-3' />Restaurar</button>
            </div>
            <p className='mt-1 text-xs text-slate-500'>{snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleString('es-PE') : 'sin fecha'}</p>
          </article>
        ))}
      </div>
      {selected ? (
        <div className='rounded-md border border-slate-200 bg-white p-2'>
          <p className='mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500'>Diff contra version actual</p>
          <div className='max-h-48 overflow-auto text-xs leading-5'>
            {diff.slice(0, 220).map((part, index) => <span key={`${part.type}-${index}`} className={part.type === 'added' ? 'bg-emerald-100 text-emerald-800' : part.type === 'removed' ? 'bg-rose-100 text-rose-800 line-through' : 'text-slate-600'}>{part.text} </span>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DocumentToolsPanel() {
  const doc = useDocumentStore(getDoc);
  const updateDocumentCover = useDocumentStore((s) => s.updateDocumentCover);
  const [tab, setTab] = useState('bibliography');
  if (!doc) return null;
  return (
    <aside className='min-h-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm'>
      <div className='flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2'>
        <ToolButton active={tab === 'bibliography'} onClick={() => setTab('bibliography')}><BookOpen className='h-3.5 w-3.5' />Refs</ToolButton>
        <ToolButton active={tab === 'comments'} onClick={() => setTab('comments')}><MessageSquare className='h-3.5 w-3.5' />Comentarios</ToolButton>
        <ToolButton active={tab === 'history'} onClick={() => setTab('history')}><History className='h-3.5 w-3.5' />Historial</ToolButton>
      </div>
      <div className='panel-scroll flex-1 overflow-auto p-3'>
        {tab === 'bibliography' ? <BibliographyTab doc={doc} updateDocumentCover={updateDocumentCover} /> : null}
        {tab === 'comments' ? <CommentsTab doc={doc} updateDocumentCover={updateDocumentCover} /> : null}
        {tab === 'history' ? <HistoryTab doc={doc} /> : null}
      </div>
    </aside>
  );
}
