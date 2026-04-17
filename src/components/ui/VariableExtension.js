import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import VariableNode from './VariableNode';
import useDocumentStore from '../../store';

export const VariableExtension = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true, // Acts as a single unit (deleted at once)

  addAttributes() {
    return {
      id: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="variable"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'variable' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableNode);
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)(\{\{([a-zA-Z0-9_]+)\}\})$/,
        handler: ({ state, range, match }) => {
          const type = this.type;
          const id = match[2];
          const matchStr = match[1]; // {{id}}
          const projectId = useDocumentStore.getState().currentProjectId;
          const { tr } = state;
          
          if (projectId) {
            const coverConfig = useDocumentStore.getState().coverConfig[projectId];
            const projectVariables = coverConfig?.projectVariables || [];
            const exists = projectVariables.some(v => v.key === id);
            
            if (!exists) {
              const nextVars = [...projectVariables, { key: id, label: id, value: '', type: 'text' }];
              setTimeout(() => {
                useDocumentStore.getState().updateCoverConfig(projectId, {
                  projectVariables: nextVars
                });
              }, 0);
            }
          }

          // To maintain the space if typed, we only delete the exact string {{id}} length from the end of the range
          const start = range.to - matchStr.length;
          tr.replaceWith(start, range.to, type.create({ id }));
        },
      }),
    ];
  },
});
