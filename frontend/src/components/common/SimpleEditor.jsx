import React, { useRef, useCallback, useEffect } from 'react';

const TOOLBAR = [
  { cmd: 'bold', icon: 'bi-type-bold', title: 'বোল্ড' },
  { cmd: 'italic', icon: 'bi-type-italic', title: 'ইটালিক' },
  { cmd: 'underline', icon: 'bi-type-underline', title: 'আন্ডারলাইন' },
  { cmd: 'insertOrderedList', icon: 'bi-list-ol', title: 'ক্রমিক তালিকা' },
  { cmd: 'insertUnorderedList', icon: 'bi-list-ul', title: 'বুলেট তালিকা' },
  { cmd: 'createLink', icon: 'bi-link-45deg', title: 'লিংক', isLink: true },
  { cmd: 'removeFormat', icon: 'bi-eraser', title: 'ফরম্যাট মুছুন' },
];

export default function SimpleEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const html = value || '';
    if (ref.current.innerHTML !== html) ref.current.innerHTML = html;
  }, [value]);

  const exec = useCallback((cmd, val) => {
    if (cmd === 'createLink') {
      const url = prompt('URL লিখুন:', 'https://');
      if (url) document.execCommand('createLink', false, url);
      return;
    }
    document.execCommand(cmd, false, val || null);
    if (ref.current) ref.current.focus();
    if (onChange) onChange(ref.current.innerHTML);
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (onChange) onChange(ref.current.innerHTML);
  }, [onChange]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  return (
    <div className="simple-editor" style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      <div className="d-flex flex-wrap gap-0 p-1" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        {TOOLBAR.map(t => (
          <button key={t.cmd} type="button"
            className="btn btn-sm btn-light border-0"
            style={{ fontSize: 13, borderRadius: 4, padding: '2px 6px' }}
            onClick={() => exec(t.cmd, t.value)}
            title={t.title}
            onMouseDown={e => e.preventDefault()}>
            <i className={`bi ${t.icon}`}></i>
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        style={{
          minHeight: 140, padding: '10px 12px', fontSize: 14,
          lineHeight: 1.8, outline: 'none', fontFamily: "'Noto Sans Bengali', sans-serif",
          background: '#fff',
        }}
      />
    </div>
  );
}