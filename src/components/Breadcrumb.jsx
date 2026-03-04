function Breadcrumb({ items }) {
  return (
    <nav aria-label='Breadcrumb' className='min-w-0'>
      <ol className='flex min-w-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500'>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className='flex min-w-0 items-center gap-1'>
            {index > 0 ? <span className='text-slate-300'>/</span> : null}
            <span
              className={`truncate max-w-[130px] md:max-w-[180px] ${
                index === items.length - 1 ? 'font-medium text-slate-700' : ''
              }`}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
