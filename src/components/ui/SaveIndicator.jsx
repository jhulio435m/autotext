import { useEffect, useState } from 'react';
import { Cloud, CloudUpload, AlertCircle, CheckCircle2 } from 'lucide-react';

function SaveIndicator({ status }) {
  const [visible, setVisible] = useState(status !== 'saved');

  useEffect(() => {
    if (status === 'saved') {
      setVisible(true);
      const timer = window.setTimeout(() => setVisible(false), 3000);
      return () => window.clearTimeout(timer);
    }

    if (!visible) {
      setVisible(true);
    }
    return undefined;
  }, [status, visible]);

  if (!visible) return null;

  const meta = {
    saving: {
      label: 'Guardando...',
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <CloudUpload className="w-3.5 h-3.5" />
    },
    unsaved: {
      label: 'Pendiente',
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <AlertCircle className="w-3.5 h-3.5" />
    },
    retrying: {
      label: 'Reintentando',
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <CloudUpload className="w-3.5 h-3.5" />
    },
    'sync-error': {
      label: 'Error de sync',
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <AlertCircle className="w-3.5 h-3.5" />
    },
    saved: {
      label: 'Guardado',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />
    }
  };

  const item = meta[status] || meta.saved;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase rounded-full border shadow-sm transition-all duration-300 ${item.classes}`}>
      {item.icon}
      {item.label}
    </div>
  );
}

export default SaveIndicator;
