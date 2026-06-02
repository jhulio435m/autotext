import { NodeViewWrapper, mergeAttributes } from '@tiptap/react';
import useDocumentStore from '../../store';
import { Database } from 'lucide-react';

export default function VariableNode({ node, updateAttributes, selected }) {
  const { id } = node.attrs;
  const projectId = useDocumentStore((state) => state.currentProjectId);
  const coverConfig = useDocumentStore((state) => state.coverConfig[projectId]);
  const projectData = coverConfig?.projectData || {};
  const projectVariables = coverConfig?.projectVariables || [];

  const meta = projectVariables.find(v => v.key === id);
  const value = projectData[id];
  
  const displayValue = value || meta?.label || id;
  const isUndefined = !value && !meta;
  const isEmpty = !value || value.trim() === '';

  return (
    <NodeViewWrapper as="span" className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md border text-sm align-baseline cursor-default select-none shadow-sm transition-colors ${selected ? 'ring-2 ring-sky-400' : ''} ${isEmpty ? 'bg-amber-50 text-amber-700 border-amber-200 gap-1' : 'bg-sky-50 text-sky-800 border-sky-200'}`} contentEditable={false}>
      {isEmpty && <Database className="w-3 h-3 opacity-60 shrink-0" />}
      <span className="max-w-[100px] sm:max-w-[140px] truncate font-medium">{displayValue}</span>
    </NodeViewWrapper>
  );
}
