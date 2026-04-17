function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'border border-slate-200 bg-slate-50 text-slate-600',
    blue: 'border border-sky-200 bg-sky-50 text-sky-700',
    purple: 'border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
    red: 'border border-rose-200 bg-rose-50 text-rose-700',
    emerald: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border border-amber-200 bg-amber-50 text-amber-700'
  };

  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export default Badge;
