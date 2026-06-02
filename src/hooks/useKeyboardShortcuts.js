import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers) {
  useEffect(() => {
    function onKeyDown(event) {
      const isInput = event.target.tagName === 'INPUT'
        || event.target.tagName === 'TEXTAREA'
        || event.target.isContentEditable;

      for (const { key, ctrl, shift, alt, handler, skipWhenInput } of handlers) {
        const ctrlOrCmd = ctrl !== false && (event.ctrlKey || event.metaKey);
        const shiftMatch = shift ? event.shiftKey : true;
        const altMatch = alt ? event.altKey : true;
        const keyMatch = event.key.toLowerCase() === key.toLowerCase();

        if (keyMatch && ctrlOrCmd && shiftMatch && altMatch) {
          if (skipWhenInput !== false && isInput) continue;
          event.preventDefault();
          handler(event);
          return;
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
