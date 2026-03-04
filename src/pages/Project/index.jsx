import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useDocumentStore from '../../store';
import CoverEditor from '../../components/CoverEditor';
import DocumentCard from '../../components/DocumentCard';
import { apiGetPlaneProjectIssues, apiGetPlaneProjects } from '../../api/client';

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
  const location = useLocation();
  const navigate = useNavigate();

  const projects = useDocumentStore((state) => state.projects);
  const projectDocuments = useDocumentStore((state) => state.documents[id]);
  const documents = projectDocuments || EMPTY_DOCS;
  const setCurrentProject = useDocumentStore((state) => state.setCurrentProject);
  const setProjectsFromPlane = useDocumentStore((state) => state.setProjectsFromPlane);
  const setDocumentsFromPlaneIssues = useDocumentStore((state) => state.setDocumentsFromPlaneIssues);
  const pushToast = useDocumentStore((state) => state.pushToast);

  const [loadingPlaneProjects, setLoadingPlaneProjects] = useState(false);
  const [planeProjectsLoaded, setPlaneProjectsLoaded] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const project = projects.find((item) => item.id === id);
  const activeTab = location.pathname.includes('/caratula') ? 'caratula' : 'documentos';

  useEffect(() => {
    if (id) setCurrentProject(id);
  }, [id, setCurrentProject]);

  useEffect(() => {
    if (!usePlaneProjects) return undefined;
    if (project) return undefined;

    let cancelled = false;
    const loadProjects = async () => {
      setLoadingPlaneProjects(true);
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
        onOpen={() => navigate(`/proyecto/${id}/documento/${doc.id}/editor`)}
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
    return <p className='soft-panel p-4 text-sm text-slate-600'>Cargando proyecto...</p>;
  }

  if (!project) {
    return <p className='soft-panel p-4 text-sm text-slate-600'>Proyecto no encontrado.</p>;
  }

  return (
    <section className='space-y-4'>
      {activeTab === 'caratula' ? (
        <>
          <header className='soft-panel animate-fade-up p-4'>
            <div className='flex justify-end'>
              <button
                type='button'
                className='btn-ghost'
                onClick={() => navigate(`/proyecto/${id}/documentos`)}
              >
                Volver a documentos
              </button>
            </div>
          </header>
          <CoverEditor projectId={id} />
        </>
      ) : (
        <div className='space-y-5'>
          {groupedDocuments.map((group) => (
            <section key={group.label} className='doc-group-panel'>
              <button
                type='button'
                className='doc-group-header'
                onClick={() => toggleGroup(group.label)}
                aria-expanded={!collapsedGroups[group.label]}
              >
                <h3 className='text-xs font-bold uppercase tracking-wide text-slate-700'>{group.label}</h3>
                <span className='text-xs font-semibold text-slate-500'>
                  {group.docs.length} {group.docs.length === 1 ? 'documento' : 'documentos'} {collapsedGroups[group.label] ? '+' : '-'}
                </span>
              </button>
              <div className={`p-3 ${collapsedGroups[group.label] ? 'hidden' : 'block'}`}>
                <div className='mx-auto max-w-5xl'>
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                    {group.docs.map((doc) => renderDocumentCard(doc))}
                  </div>
                </div>
              </div>
            </section>
          ))}
          {!groupedDocuments.length ? (
            <div className='soft-panel p-6 text-sm text-slate-500'>Este proyecto aun no tiene documentos.</div>
          ) : null}
        </div>
      )}

    </section>
  );
}

export default Project;
