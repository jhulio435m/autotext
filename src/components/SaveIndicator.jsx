import { useEffect, useState } from 'react';

function SaveIndicator({ status }) {
  const [visible, setVisible] = useState(status !== 'saved');

  useEffect(() => {
    if (status === 'saved') {
      setVisible(true);
      const timer = window.setTimeout(() => setVisible(false), 3000);
      return () => window.clearTimeout(timer);
    }

    setVisible(true);
    return undefined;
  }, [status]);

  if (!visible) return null;

  const tone = {
    saving: 'text-amber-700',
    unsaved: 'text-rose-700',
    saved: 'text-emerald-700'
  };

  const dotTone = {
    saving: 'bg-amber-500',
    unsaved: 'bg-rose-500',
    saved: 'bg-emerald-500'
  };

  const label = status === 'saving' ? 'Guardando...' : status === 'unsaved' ? 'Pendiente' : 'Guardado';

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold ${tone[status] || tone.saved}`}>
      <span className={`dot-status ${dotTone[status] || dotTone.saved}`} />
      {label}
    </span>
  );
}

export default SaveIndicator;
