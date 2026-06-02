import { ChevronRight } from 'lucide-react';

function Breadcrumb({ items }) {
  if (!items || !items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex overflow-hidden">
      <ol className="flex items-center space-x-1.5 flex-nowrap overflow-hidden">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={`${item.label}-${index}`} className="flex items-center min-w-0 max-w-[90px] md:max-w-[140px]">
              <span
                className={`truncate text-[11px] min-w-0 ${
                  isLast 
                    ? 'font-semibold text-slate-800' 
                    : 'font-medium text-slate-500'
                }`}
                title={item.label}
              >
                {item.label}
              </span>
              {!isLast && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-1.5 shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
