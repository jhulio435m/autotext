import { useEffect, useRef } from 'react';

function AutoTextarea({
  value,
  onChange,
  minRows = 1,
  className = '',
  style,
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={minRows}
      value={value}
      onChange={onChange}
      className={className}
      style={{ ...style, overflow: 'hidden', resize: 'none' }}
    />
  );
}

export default AutoTextarea;
