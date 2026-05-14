import 'katex/dist/katex.min.css';
import { useMemo, useState } from 'react';
import useDocumentStore from '../../store';
import PreviewToolbar from './PreviewToolbar';
import { exportDocumentPdf, exportDocumentTex } from './export-actions';
import { renderPreviewNode } from './renderers';
// import HtmlCoverGallery from './HtmlCoverGallery';
import { normalizePageSettings } from '../../utils/pageConfig';

const EMPTY_COVER = Object.freeze({});

function preferNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      if (value.trim()) return value;
      continue;
    }
    if (value != null) return value;
  }
  return '';
}

function normalizePreviewColor(value) {
  const color = String(value || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : '#006399';
}

function Preview({ embedded = false, editableText = false, scrollContainerId = '' }) {
  const [zoom, setZoom] = useState(embedded ? 62 : 100);

  const structure = useDocumentStore((state) => state.structure);
  const formData = useDocumentStore((state) => state.formData);
  const updateFormData = useDocumentStore((state) => state.updateFormData);
  const updateNodeProps = useDocumentStore((state) => state.updateNodeProps);
  const createVariableFromTemplateSelection = useDocumentStore((state) => state.createVariableFromTemplateSelection);
  const setSelectedId = useDocumentStore((state) => state.setSelectedId);
  const getCurrentDocument = useDocumentStore((state) => state.getCurrentDocument);
  const getCurrentProject = useDocumentStore((state) => state.getCurrentProject);
  const coverConfigByProject = useDocumentStore((state) => state.coverConfig);
  const validateRequiredBeforeExport = useDocumentStore((state) => state.validateRequiredBeforeExport);
  const pushToast = useDocumentStore((state) => state.pushToast);
  const currentDocument = getCurrentDocument();
  const currentProject = getCurrentProject();
  const projectCoverConfig = coverConfigByProject[currentProject?.id] || EMPTY_COVER;
  const documentCoverData = currentDocument?.coverData || EMPTY_COVER;
  const coverConfig = useMemo(() => ({
    ...projectCoverConfig,
    ...documentCoverData,
    projectData: {
      ...(projectCoverConfig.projectData || {}),
      ...(documentCoverData.projectData || {})
    },
    companyName: preferNonEmpty(documentCoverData.companyName, projectCoverConfig.companyName),
    slogan: preferNonEmpty(documentCoverData.slogan, projectCoverConfig.slogan),
    subtitle: preferNonEmpty(documentCoverData.subtitle, projectCoverConfig.subtitle),
    month: preferNonEmpty(documentCoverData.month, projectCoverConfig.month),
    year: preferNonEmpty(documentCoverData.year, projectCoverConfig.year),
    docCode: preferNonEmpty(documentCoverData.docCode, projectCoverConfig.docCode),
    date: preferNonEmpty(documentCoverData.date, projectCoverConfig.date),
    locationLabel: preferNonEmpty(documentCoverData.locationLabel, projectCoverConfig.locationLabel),
    logo: preferNonEmpty(documentCoverData.logo, projectCoverConfig.logo),
    title: currentDocument?.name || projectCoverConfig.title || documentCoverData.title || '',
    coverPhoto: currentProject?.coverImageUrl || projectCoverConfig.coverPhoto || documentCoverData.coverPhoto || ''
  }), [currentDocument?.name, currentProject?.coverImageUrl, documentCoverData, projectCoverConfig]);
  const projectName = coverConfig.projectData?.var_nombre_proyecto || coverConfig.subtitle || currentDocument?.name || 'Proyecto';
  const primaryColor = normalizePreviewColor(coverConfig.primaryColor);
  const pageSettings = useMemo(() => normalizePageSettings(coverConfig), [coverConfig]);
  const locationLabel = coverConfig.locationLabel
    || [coverConfig.projectData?.var_provincia, coverConfig.projectData?.var_departamento].filter(Boolean).join(' -- ')
    || 'Ubicacion por definir';
  // When embedded in the editor right panel, use compact margins so more content is visible
  const embeddedMargin = 8; // mm — minimal visual margin
  const resolvedMarginTop    = embedded ? embeddedMargin : pageSettings.marginTop;
  const resolvedMarginRight  = embedded ? embeddedMargin : pageSettings.marginRight;
  const resolvedMarginBottom = embedded ? embeddedMargin : pageSettings.marginBottom;
  const resolvedMarginLeft   = embedded ? embeddedMargin : pageSettings.marginLeft;

  const pageShellStyle = {
    width: `${pageSettings.widthMm}mm`,
    fontFamily: pageSettings.previewFontFamily,
    fontSize: `${pageSettings.fontSize}pt`,
    lineHeight: pageSettings.lineHeight
  };
  const contentPaddingStyle = {
    paddingTop: `${resolvedMarginTop}mm`,
    paddingRight: `${resolvedMarginRight}mm`,
    paddingBottom: `${resolvedMarginBottom}mm`,
    paddingLeft: `${resolvedMarginLeft}mm`
  };
  const contentHeight = Math.max(140, pageSettings.heightMm - resolvedMarginTop - resolvedMarginBottom);
  const availableVariables = useMemo(() => {
    const items = [];
    const walk = (nodes) => {
      (nodes || []).forEach((node) => {
        if (node?.isStructure) {
          walk(node.children || []);
          return;
        }
        if (node?.type === 'variable') {
          items.push({
            id: node.id,
            key: node.variableKey || node.id,
            label: node.label || node.variableKey || node.id
          });
        }
      });
    };
    walk(structure);
    return items;
  }, [structure]);

  const handleExportTex = () => {
    const validation = validateRequiredBeforeExport();
    if (!validation.ok) {
      pushToast('Hay campos obligatorios vacíos. Revisa el documento.', 'warning');
      return;
    }

    const payload = {
      projectId: currentProject?.id || currentDocument?.issueProjectId || '',
      documentId: currentDocument?.id || 'documento',
      documentName: currentDocument?.name || 'Documento',
      structure,
      formData,
      coverData: coverConfig
    };

    exportDocumentTex({ payload, structure, formData, coverConfig, currentDocument, pushToast });
  };

  const handleExportPdf = () => {
    const validation = validateRequiredBeforeExport();
    if (!validation.ok) {
      pushToast('Completa los campos obligatorios antes de exportar PDF.', 'warning');
      return;
    }
    const payload = {
      projectId: currentProject?.id || currentDocument?.issueProjectId || '',
      documentId: currentDocument?.id || 'documento',
      documentName: currentDocument?.name || 'Documento',
      structure,
      formData,
      coverData: coverConfig
    };

    exportDocumentPdf({ payload, pushToast });
  };

  return (
    <section className={`flex flex-col ${embedded ? 'min-w-0 h-full' : 'space-y-3'}`}>
      <PreviewToolbar
        compact={embedded}
        zoom={zoom}
        setZoom={setZoom}
        onExportTex={handleExportTex}
        onExportPdf={handleExportPdf}
      />

      <div
        id={scrollContainerId || undefined}
        className={`panel-scroll flex-1 overflow-x-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${embedded ? 'p-2' : 'p-6'}`}
      >
        {/* Outer: constrains width to scaled size, centers the page, no height clip */}
        <div
          style={{
            width: `${pageSettings.widthMm * (zoom / 100)}mm`,
            margin: '0 auto',
          }}
        >
          {/* Inner full-size page that scales down keeping top-left anchor */}
          <div
            style={{
              ...pageShellStyle,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${pageSettings.widthMm}mm`,
            }}
          >
          {/* Caratula HTML desactivada temporalmente.
          <HtmlCoverGallery
            coverConfig={coverConfig}
            currentDocumentName={currentDocument?.name}
            previewWidth={pageShellStyle.width}
            previewHeight={`${pageSettings.heightMm}mm`}
          />
          */}

          <article className='overflow-hidden rounded-lg bg-white shadow-lg' style={{ ...pageShellStyle, minHeight: `${pageSettings.heightMm}mm` }}>
            {pageSettings.showHeaderFooter ? <div className='h-[10px] w-full' style={{ backgroundColor: primaryColor }} /> : null}
            <div className='flex flex-col' style={contentPaddingStyle}>
              {pageSettings.showHeaderFooter ? (
                <div className='border-b border-slate-300 pb-3 pt-1'>
                  <div className='flex items-start gap-4'>
                    <div className='min-w-0 flex-1'>
                      <p className='text-[11px] font-bold uppercase leading-snug text-slate-800'>{projectName}</p>
                    </div>
                    <div className='flex h-16 w-20 shrink-0 items-center justify-end'>
                      {coverConfig.logo ? (
                        <img src={coverConfig.logo} alt='logo' className='max-h-full max-w-full object-contain' />
                      ) : (
                        <div className='flex h-14 w-16 items-center justify-center border border-slate-300 text-[10px] text-slate-400'>LOGO</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <section className='space-y-5 pt-8' style={{ minHeight: `${Math.max(80, contentHeight - (pageSettings.showHeaderFooter ? 34 : 0) - 20)}mm` }}>
                {structure.map((node, index) => renderPreviewNode(node, formData, [index + 1], [], {
                  editableText,
                  onEdit: updateFormData,
                  availableVariables,
                  onCreateVariable: createVariableFromTemplateSelection,
                  updateNodeProps,
                  setSelectedId
                }))}
              </section>

              {pageSettings.showHeaderFooter ? (
                <footer className='mt-6 flex items-center justify-between border-t border-slate-300 pt-2 text-[11px] text-slate-700'>
                  <span>{locationLabel}</span>
                  <span>{currentDocument?.name || coverConfig.title || 'Documento tecnico'}</span>
                  <span>Pagina 1</span>
                </footer>
              ) : null}
            </div>
          </article>
          </div>{/* end inner scale div */}
        </div>{/* end outer shrink-wrap */}
      </div>
    </section>
  );
}

export default Preview;
