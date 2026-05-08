import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';

const ELEMENTS = [
  { id: 'logo', label: 'লোগো', icon: 'bi-image' },
  { id: 'qrcode', label: 'QR কোড', icon: 'bi-qr-code' },
  { id: 'signature', label: 'স্বাক্ষর', icon: 'bi-pen' },
  { id: 'trainee_name', label: 'প্রশিক্ষণার্থীর নাম', icon: 'bi-person' },
  { id: 'course_name', label: 'কোর্সের নাম', icon: 'bi-book' },
  { id: 'cert_no', label: 'সার্টিফিকেট নং', icon: 'bi-hash' },
  { id: 'date', label: 'তারিখ', icon: 'bi-calendar' },
];

export default function CertificateTemplateDesigner() {
  const [bgImage, setBgImage] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);
  const [elements, setElements] = useState([
    { id: 'logo', x: 50, y: 40, w: 100, h: 100, visible: true },
    { id: 'cert_no', x: 200, y: 200, w: 200, h: 30, visible: true },
    { id: 'trainee_name', x: 200, y: 260, w: 300, h: 40, visible: true },
    { id: 'course_name', x: 200, y: 320, w: 300, h: 30, visible: true },
    { id: 'date', x: 200, y: 380, w: 200, h: 30, visible: true },
    { id: 'qrcode', x: 500, y: 400, w: 80, h: 80, visible: true },
    { id: 'signature', x: 400, y: 450, w: 120, h: 50, visible: true },
  ]);
  const [dragging, setDragging] = useState(null);
  const canvasRef = useRef(null);

  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBgImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setBgPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const getElementMeta = (id) => ELEMENTS.find(el => el.id === id);

  const handleMouseDown = (el, e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging({
      id: el.id,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      origX: el.x,
      origY: el.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = e.clientX - rect.left - dragging.startX;
    const dy = e.clientY - rect.top - dragging.startY;
    setElements(prev => prev.map(el =>
      el.id === dragging.id
        ? { ...el, x: Math.max(0, dragging.origX + dx), y: Math.max(0, dragging.origY + dy) }
        : el
    ));
  };

  const handleMouseUp = () => setDragging(null);

  const toggleElement = (id) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, visible: !el.visible } : el));
  };

  const handleSave = () => {
    const template = { background: bgImage?.name || null, elements };
    localStorage.setItem('cert_template', JSON.stringify(template));
    toast.success('টেমপ্লেট সংরক্ষিত');
  };

  return (
    <div>
      <h5 className="fw-bold mb-3"><i className="bi bi-file-earmark-image me-2"></i>সার্টিফিকেট টেমপ্লেট ডিজাইনার</h5>
      <div className="row g-3">
        <div className="col-md-9">
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-body position-relative" style={{ minHeight: 500 }}
              onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
              <div ref={canvasRef} className="position-relative mx-auto border" style={{
                width: 800, height: 550, background: bgPreview ? `url(${bgPreview})` : '#f8f9fa',
                backgroundSize: 'cover', backgroundPosition: 'center', cursor: dragging ? 'grabbing' : 'default',
                overflow: 'hidden',
              }}>
                {elements.filter(el => el.visible).map(el => {
                  const meta = getElementMeta(el.id);
                  return (
                    <div key={el.id}
                      className="position-absolute d-flex align-items-center justify-content-center border border-dashed"
                      style={{
                        left: el.x, top: el.y, width: el.w, height: el.h,
                        cursor: 'grab', backgroundColor: 'rgba(13,110,253,0.08)',
                        borderColor: dragging?.id === el.id ? '#0d6efd' : '#dee2e6',
                        fontSize: 12, color: '#6c757d', zIndex: dragging?.id === el.id ? 10 : 1,
                        userSelect: 'none',
                      }}
                      onMouseDown={(e) => handleMouseDown(el, e)}>
                      <i className={`bi ${meta?.icon} me-1`}></i>
                      {meta?.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-body">
              <h6 className="fw-bold mb-3">এলিমেন্ট</h6>
              {ELEMENTS.map(meta => {
                const el = elements.find(e => e.id === meta.id);
                return (
                  <div key={meta.id} className="d-flex align-items-center gap-2 mb-2">
                    <input className="form-check-input mt-0" type="checkbox"
                      checked={el?.visible ?? true} onChange={() => toggleElement(meta.id)} />
                    <i className={`bi ${meta.icon} text-primary`}></i>
                    <span style={{ fontSize: 13 }}>{meta.label}</span>
                  </div>
                );
              })}

              <hr />
              <h6 className="fw-bold mb-2">পটভূমি</h6>
              <input className="form-control form-control-sm" type="file" accept="image/*" onChange={handleBgUpload} />

              <hr />
              <button className="btn btn-primary btn-sm w-100 mb-2" onClick={handleSave}>
                <i className="bi bi-check me-1"></i>সংরক্ষণ
              </button>
              <button className="btn btn-outline-secondary btn-sm w-100">
                <i className="bi bi-file-pdf me-1"></i>প্রিভিউ PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
