import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light-border.css';
import VariableMentionList from './VariableMentionList';
import useDocumentStore from '../../store';

export const getVariableMentionSuggestions = () => {
  return {
    items: ({ query }) => {
      const q = query.toLowerCase();
      const state = useDocumentStore.getState();
      const projectId = state.currentProjectId;
      if (!projectId) return [];
      
      const config = state.coverConfig[projectId] || {};
      const explicitVars = config.projectVariables || [];
      const implicitKeys = Object.keys(config.projectData || {});
      
      const metaMap = new Map();
      // Add implicit keys with basic labels first
      implicitKeys.forEach(k => metaMap.set(k, { key: k, label: k, value: config.projectData[k], type: 'text' }));
      // Overwrite with explicit (which have friendly labels)
      explicitVars.forEach(v => metaMap.set(v.key, v));
      
      const allVars = Array.from(metaMap.values()).filter(v => v.type !== 'block');
      
      return allVars.filter(v => 
        (v.label || '').toLowerCase().includes(q) || 
        (v.key || '').toLowerCase().includes(q)
      ).slice(0, 15);
    },
    
    render: () => {
      let component;
      let popup;
      
      return {
        onStart: props => {
          component = new ReactRenderer(VariableMentionList, {
            props,
            editor: props.editor,
          });
          
          if (!props.clientRect) return;

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            maxWidth: 320,
            theme: 'light-border',
            animation: 'fade'
          });

          if (props.items.length === 0) {
            popup[0].hide();
          }
        },
        
        onUpdate(props) {
          component.updateProps(props);

          if (!props.clientRect) return;

          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          });

          if (props.items.length === 0) {
            popup[0].hide();
          } else {
            popup[0].show();
          }
        },
        
        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup[0].hide();
            return true;
          }
          return component.ref?.onKeyDown(props);
        },
        
        onExit() {
          if (popup && popup[0]) {
            popup[0].destroy();
          }
          if (component) {
            component.destroy();
          }
        },
      };
    },
    command: ({ editor, range, props }) => {
      // Instead of inserting a default mention node, we insert our custom variable node
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: 'variable',
            attrs: { id: props.id },
          },
        ])
        .run();
    },
  };
};
