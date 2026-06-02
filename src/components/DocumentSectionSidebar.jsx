import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDocumentStore from '../store';

const INDENT = 16;

function SectionRow({
  section,
  depth,
  depthTrail,
  isFirstRoot,
  active,
  onSelect,
  expanded,
  onToggle
}) {
  const hasChildren = (section.children || []).length > 0;
  const paddingLeft = depth * INDENT + 20;
  const isLast = depthTrail[depthTrail.length - 1];

  return (
    <div className='relative group'>
      <div
        className={`relative flex cursor-pointer items-center gap-1 py-0.5 pr-2 text-xs transition-colors ${
          active ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-600 hover:text-slate-900'
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={() => onSelect(section.id)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSelect(section.id); }}
        tabIndex={0}
        role='button'
      >
        {depthTrail.slice(0, -1).map((isLastAncestor, i) => (
          !isLastAncestor && (
            <div
              key={`anc-${i}`}
              className='pointer-events-none absolute top-0 bottom-0 w-px border-l border-slate-200'
              style={{ left: `${i * INDENT + 8}px` }}
            />
          )
        ))}
        <div
          className='pointer-events-none absolute w-px border-l border-slate-200'
          style={{
            left: `${depth * INDENT + 8}px`,
            top: isFirstRoot ? '50%' : '0',
            bottom: isLast ? '50%' : '0'
          }}
        />
        <div
          className='pointer-events-none absolute top-1/2 h-px border-t border-slate-200'
          style={{ left: `${depth * INDENT + 8}px`, width: `${INDENT}px` }}
        />

        {hasChildren && (
          <button
            type='button'
            aria-label='Expandir o colapsar'
            className='absolute z-10 grid h-3.5 w-3.5 cursor-pointer place-items-center rounded border border-slate-300 bg-white text-[7px] font-bold text-slate-500 transition-colors hover:border-slate-400'
            style={{ left: `${depth * INDENT + 8}px`, top: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={(e) => { e.stopPropagation(); onToggle(section.id); }}
          >
            {expanded ? '−' : '+'}
          </button>
        )}

        <span className='truncate'>{section.title}</span>

        <span className={`ml-auto shrink-0 text-[10px] ${active ? 'text-sky-500' : 'text-slate-400'}`}>
          {section.completed}/{section.required}
        </span>
      </div>
    </div>
  );
}

function flattenSections(sections, depthTrail, expandedMap) {
  const result = [];
  sections.forEach((section, index) => {
    const isLast = index === sections.length - 1;
    const currentDepthTrail = [...depthTrail, isLast];
    const isExpanded = expandedMap[section.id] !== false;
    result.push({ section, depthTrail: currentDepthTrail, isFirstRoot: depthTrail.length === 0 && index === 0 });
    if (isExpanded && (section.children || []).length > 0) {
      result.push(...flattenSections(section.children, currentDepthTrail, expandedMap));
    }
  });
  return result;
}

function computeRequiredStats(nodes) {
  return (nodes || []).reduce((acc, node) => {
    if (node?.isStructure) {
      const childStats = computeRequiredStats(node.children || []);
      return {
        required: acc.required + childStats.required,
        completed: acc.completed + childStats.completed
      };
    }
    if (!node?.required) return acc;
    const formData = useDocumentStore.getState().formData;
    const value = formData?.[node.id];
    const completed = value != null && String(value).trim() !== '' ? 1 : 0;
    return {
      required: acc.required + 1,
      completed: acc.completed + completed
    };
  }, { required: 0, completed: 0 });
}

function enrichSection(node, formData) {
  const stats = computeRequiredStats(node.children || []);
  const tone = stats.required === 0 ? 'neutral' : stats.completed >= stats.required ? 'complete' : stats.completed > 0 ? 'progress' : 'pending';
  return {
    id: node.id,
    title: node.title || 'Sección',
    depth: 0,
    required: stats.required,
    completed: stats.completed,
    tone,
    children: (node.children || []).filter((child) => child?.isStructure).map((child) => enrichSubSection(child, formData, 1))
  };
}

function enrichSubSection(node, formData, depth) {
  const stats = computeRequiredStats(node.children || []);
  const tone = stats.required === 0 ? 'neutral' : stats.completed >= stats.required ? 'complete' : stats.completed > 0 ? 'progress' : 'pending';
  return {
    id: node.id,
    title: node.title || 'Sección',
    depth,
    required: stats.required,
    completed: stats.completed,
    tone,
    children: (node.children || []).filter((child) => child?.isStructure).map((child) => enrichSubSection(child, formData, depth + 1))
  };
}

function DocumentSectionSidebar({ scrollContainerId = 'document-builder-scroll' }) {
  const structure = useDocumentStore((state) => state.structure);
  const formData = useDocumentStore((state) => state.formData);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [expandedMap, setExpandedMap] = useState({});
  const flatRefs = useRef({});

  const sections = useMemo(() => {
    return (structure || []).filter((n) => n?.isStructure).map((n) => enrichSection(n, formData));
  }, [formData, structure]);

  const flatRows = useMemo(() => flattenSections(sections, [], expandedMap), [sections, expandedMap]);

  const overall = useMemo(() => {
    return sections.reduce(
      (acc, s) => ({
        required: acc.required + s.required,
        completed: acc.completed + s.completed
      }),
      { required: 0, completed: 0 }
    );
  }, [sections]);

  const handleToggle = useCallback((id) => {
    setExpandedMap((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  }, []);

  const handleSelect = useCallback((id) => {
    setActiveSectionId(id);
    const el = document.getElementById(`preview-section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    if (!flatRows.length) return undefined;
    const root = document.getElementById(scrollContainerId);
    const targets = flatRows
      .map(({ section }) => document.getElementById(`preview-section-${section.id}`))
      .filter(Boolean);
    if (!targets.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSectionId(visible[0].target.id.replace('preview-section-', ''));
        }
      },
      { root, threshold: [0.2, 0.45, 0.7] }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [scrollContainerId, flatRows]);

  return (
    <aside className='hidden min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white xl:flex'>
      <header className='flex items-center justify-between border-b border-slate-200 px-3 py-1.5'>
        <h3 className='text-xs font-semibold text-slate-700'>Secciones del documento</h3>
        <span className='text-[10px] text-slate-400'>{overall.completed}/{overall.required}</span>
      </header>

      <div className='flex-1 overflow-auto p-2'>
        <div>
          {flatRows.map(({ section, depthTrail, isFirstRoot }) => {
            const depth = depthTrail.length - 1;
            const active = activeSectionId === section.id;
            const expanded = expandedMap[section.id] !== false;

            return (
              <div key={section.id} ref={(el) => { flatRefs.current[section.id] = el; }}>
                <SectionRow
                  section={section}
                  depth={depth}
                  depthTrail={depthTrail}
                  isFirstRoot={isFirstRoot}
                  active={active}
                  onSelect={handleSelect}
                  expanded={expanded}
                  onToggle={handleToggle}
                />
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export default DocumentSectionSidebar;
