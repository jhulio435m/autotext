import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Database } from 'lucide-react';

export default forwardRef(function VariableMentionList(props, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        if (props.items.length > 0) {
          props.command({ id: props.items[selectedIndex].key });
        }
        return true;
      }
      return false;
    },
  }));

  if (!props.items?.length) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[200px] max-h-64 overflow-y-auto">
      {props.items.map((item, index) => {
        let friendlyLabel = item.label || item.key;
        if (friendlyLabel === item.key && friendlyLabel.startsWith('var_')) {
          friendlyLabel = friendlyLabel.replace(/^var_/, '').replace(/_/g, ' ');
          friendlyLabel = friendlyLabel.charAt(0).toUpperCase() + friendlyLabel.slice(1);
        }

        return (
          <button
            key={item.key}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left rounded-lg transition-colors ${
              index === selectedIndex ? 'bg-sky-50 text-sky-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => props.command({ id: item.key })}
          >
            <Database className="w-3.5 h-3.5 opacity-40 shrink-0" />
            <span className="font-medium truncate">{friendlyLabel}</span>
          </button>
        );
      })}
    </div>
  );
});
