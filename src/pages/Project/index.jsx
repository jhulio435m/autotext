import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import useDocumentStore from '../../store';
import DocumentCard from '../../components/DocumentCard';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { apiDeleteDocument, apiGetPlaneProjectIssues, apiGetPlaneProjects } from '../../api/client';

const EMPTY_DOCS = Object.freeze([]);

function sortDocumentsByName(a, b) {
  return String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' });
}

function normalizeLabelValue(rawLabel) {
  if (typeof rawLabel === 'string') return rawLabel.trim();
  if (rawLabel && typeof rawLabel === 'object') {
    const candidate = rawLabel.name || rawLabel.label || rawLabel.title || '';
    return String(candidate).trim();
  }
  return '';
}

function getDocumentGroupLabel(doc) {
  const labels = Array.isArray(doc?.labels) ? doc.labels.map(normalizeLabelValue).filter(Boolean) : [];
  const subgroup = labels.find((label) => label.toLowerCase() !== 'automatizable');
  return subgroup || 'Sin subgrupo';
}

function getGroupSortMeta(label) {
  const match = String(label || '').match(/^(\d{2})\s+/);
  if (!match) return { hasCode: false, code: Number.POSITIVE_INFINITY };
  return { hasCode: true, code: Number(match[1]) };
}

function Project() {
  const usePlaneProjects = import.meta.env.VITE_USE_PLANE_PROJECTS === 'true';
  const usePlaneProjectIssues = import.meta.env.VITE_USE_PLANE_PROJECT_ISSUES === 'true';
  const { id } = useParams();
  const navigate = useNavigate();

  const projects = useDocumentStore((state) => state.projects);
  const projectDocuments = useDocumentStore((state) => state.documents[id]);
  const documents = projectDocuments || EMPTY_DOCS;
  const setCurrentProject = useDocumentStore((state) => state.setCurrentProject);
  const setProjectsFromPlane = useDocumentStore((state) => state.setProjectsFromPlane);
  const setDocumentsFromPlaneIssues = useDocumentStore((state) => state.setDocumentsFromPlaneIssues);
  const pushToast = useDocumentStore((state) => state.pushToast);

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleDeleteDocument = async () => {
    if (!deleteConfirm) return;
    try {
      await apiDeleteDocument(id, deleteConfirm.id);
      useDocumentStore.getState().removeDocument(id, deleteConfirm.id);
      pushToast('Documento eliminado.', 'success');
    } catch (error) {
      pushToast(`No se pudo eliminar: ${error?.message || 'error desconocido'}`, 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const [loadingPlaneProjects, setLoadingPlaneProjects] = useState(false);
  const [planeProjectsLoaded, setPlaneProjectsLoaded] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const project = projects.find((item) => item.id === id);
  const activeTab = 'documentos';

  useEffect(() => {
    if (id) setCurrentProject(id);
  }, [id, setCurrentProject]);

  useEffect(() => {
    if (!usePlaneProjects) return undefined;

    let cancelled = false;
    const loadProjects = async () => {
      if (!project) {
        setLoadingPlaneProjects(true);
      }
      try {
        const response = await apiGetPlaneProjects({ limit: 200 });
        if (!cancelled && response?.ok && Array.isArray(response.projects)) {
          setProjectsFromPlane(response.projects);
        }
      } catch (error) {
        if (!cancelled) {
          pushToast(`No se pudo leer proyectos de Plane: ${error?.message || 'error desconocido'}`, 'warning');
        }
      } finally {
        if (!cancelled) {
          setLoadingPlaneProjects(false);
          setPlaneProjectsLoaded(true);
        }
      }
    };

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [project, pushToast, setProjectsFromPlane, usePlaneProjects]);

  useEffect(() => {
    if (!id) return undefined;
    if (!project?.source || project.source !== 'plane') return undefined;
    if (!usePlaneProjectIssues) return undefined;

    let cancelled = false;
    const loadPlaneIssues = async () => {
      try {
        const response = await apiGetPlaneProjectIssues(id, {
          label: 'Automatizable',
          limit: 300
        });
        if (!cancelled && response?.ok) {
          setDocumentsFromPlaneIssues(id, response.issues || []);
        }
      } catch (error) {
        if (!cancelled) {
          pushToast(`No se pudo cargar issues Automatizable: ${error?.message || 'error desconocido'}`, 'warning');
        }
      }
    };

    loadPlaneIssues();

    return () => {
      cancelled = true;
    };
  }, [id, project?.source, pushToast, setDocumentsFromPlaneIssues, usePlaneProjectIssues]);

  const groupedDocuments = useMemo(() => {
    const groupsMap = new Map();

    documents.forEach((doc) => {
      const groupLabel = getDocumentGroupLabel(doc);
      const bucket = groupsMap.get(groupLabel) || [];
      bucket.push(doc);
      groupsMap.set(groupLabel, bucket);
    });

    return Array.from(groupsMap.entries())
      .map(([label, docs]) => ({
        label,
        docs: docs.slice().sort(sortDocumentsByName)
      }))
      .sort((a, b) => {
        const aMeta = getGroupSortMeta(a.label);
        const bMeta = getGroupSortMeta(b.label);

        if (aMeta.hasCode && bMeta.hasCode) return aMeta.code - bMeta.code;
        if (aMeta.hasCode) return -1;
        if (bMeta.hasCode) return 1;
        if (a.label === 'Sin subgrupo') return 1;
        if (b.label === 'Sin subgrupo') return -1;
        return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
      });
  }, [documents]);

  const renderDocumentCard = (doc) => {
    return (
      <DocumentCard
        key={doc.id}
        doc={doc}
        onOpen={() => navigate(`/proyecto/${id}/documento/${doc.id}/constructor`)}
        onDelete={doc.source === 'plane_issue' ? undefined : () => setDeleteConfirm(doc)}
      />
    );
  };

  const toggleGroup = (label) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  if (!project && usePlaneProjects && (loadingPlaneProjects || !planeProjectsLoaded)) {
    return <p className='rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>Cargando proyecto...</p>;
  }

  if (!project) {
    return <p className='rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>Proyecto no encontrado.</p>;
  }

  return (
    <section className='space-y-4'>
      <header className='rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600'>
                {project.code || 'Sin código'}
              </span>
              <span className='text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400'>
                {project.source === 'plane' ? 'Plane' : 'Local'}
              </span>
            </div>
            <h2 className='mt-2 truncate text-xl font-semibold tracking-[-0.02em] text-slate-950'>{project.name}</h2>
            <p className='mt-1 max-w-3xl text-sm text-slate-500'>
              {project.description || 'Gestiona documentos y configuración visual de este proyecto.'}
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition ${
                activeTab === 'documentos'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
              onClick={() => navigate(`/proyecto/${id}/documentos`)}
            >
              Documentos
            </button>
          </div>
        </div>
      </header>

      <div className='space-y-5'>
          {groupedDocuments.map((group) => (
            <section key={group.label} className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
              <button
                type='button'
                className='flex w-full items-center justify-between gap-3 border-0 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 text-left'
                onClick={() => toggleGroup(group.label)}
                aria-expanded={!collapsedGroups[group.label]}
              >
                <div className='min-w-0'>
                  <h3 className='truncate text-xs font-bold uppercase tracking-[0.16em] text-slate-700'>{group.label}</h3>
                </div>
                <span className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500'>
                  {group.docs.length} {group.docs.length === 1 ? 'documento' : 'documentos'}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${collapsedGroups[group.label] ? '-rotate-90' : 'rotate-0'}`}
                  />
                </span>
              </button>
              <div className={collapsedGroups[group.label] ? 'hidden' : 'block'}>
                <div className='grid grid-cols-1 gap-3 p-4 xl:grid-cols-2'>
                  {group.docs.map((doc) => renderDocumentCard(doc))}
                </div>
              </div>
            </section>
          ))}
          {!groupedDocuments.length ? (
            <div className='rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
              <h3 className='text-base font-semibold text-slate-900'>Este proyecto aún no tiene documentos.</h3>
              <p className='mt-2 text-sm text-slate-500'>Cuando se carguen o sincronicen documentos, aparecerán aquí agrupados por subgrupo.</p>
            </div>
          ) : null}
        </div>
      {deleteConfirm ? (
        <ConfirmDialog
          open
          title='Eliminar documento'
          message={`Esta accion eliminara permanentemente "${deleteConfirm.name}". No se puede deshacer.`}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteDocument}
        />
      ) : null}
    </section>
  );
}

export default Project;
