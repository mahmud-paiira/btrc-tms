import React, { useState, useRef } from 'react';

export default function OCRUpload({ onExtracted, onBack, disabled, onError }) {
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const frontRef = useRef(null);
  const backRef = useRef(null);

  const handleFrontChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleBackChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!frontFile) {
      setError('অনুগ্রহ করে এনআইডির সামনের ছবি আপলোড করুন');
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('front_image', frontFile);
    if (backFile) formData.append('back_image', backFile);

    try {
      const { data } = await import('../../services/publicService')
        .then((m) => m.default.ocrExtract(formData));

      if (data.success) {
        onExtracted(data.data);
      } else {
        const msg = data.error || 'OCR প্রসেসিং ব্যর্থ হয়েছে';
        setError(msg);
        onError?.(msg);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'OCR সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (side) => {
    if (side === 'front') {
      setFrontFile(null);
      setFrontPreview(null);
      if (frontRef.current) frontRef.current.value = '';
    } else {
      setBackFile(null);
      setBackPreview(null);
      if (backRef.current) backRef.current.value = '';
    }
  };

  return (
    <div className="ocr-upload">
      <div className="row g-4">
        <div className="col-12 col-md-6">
          <div className="upload-box border rounded p-3 text-center">
            <h6 className="mb-3">এনআইডি - সামনের অংশ</h6>
            {frontPreview ? (
              <div className="preview-wrapper">
                <img src={frontPreview} alt="NID Front" className="img-fluid rounded mb-2" />
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeImage('front')}
                >
                  <i className="bi bi-trash me-1"></i>সরান
                </button>
              </div>
            ) : (
              <div
                className={`drop-zone p-4 border rounded ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
                onClick={() => !disabled && frontRef.current?.click()}
              >
                <i className="bi bi-image display-4 text-muted"></i>
                <p className="mt-2 mb-0">ছবি আপলোড করতে ক্লিক করুন</p>
                <small className="text-muted">JPG, PNG</small>
              </div>
            )}
            <input
              ref={frontRef}
              type="file"
              accept="image/*"
              onChange={handleFrontChange}
              hidden
            />
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="upload-box border rounded p-3 text-center">
            <h6 className="mb-3">এনআইডি - পেছনের অংশ (ঐচ্ছিক)</h6>
            {backPreview ? (
              <div className="preview-wrapper">
                <img src={backPreview} alt="NID Back" className="img-fluid rounded mb-2" />
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeImage('back')}
                >
                  <i className="bi bi-trash me-1"></i>সরান
                </button>
              </div>
            ) : (
              <div
                className="drop-zone p-4 border rounded cursor-pointer"
                onClick={() => backRef.current?.click()}
              >
                <i className="bi bi-image display-4 text-muted"></i>
                <p className="mt-2 mb-0">ছবি আপলোড করতে ক্লিক করুন</p>
                <small className="text-muted">ঐচ্ছিক</small>
              </div>
            )}
            <input
              ref={backRef}
              type="file"
              accept="image/*"
              onChange={handleBackChange}
              hidden
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mt-3">{error}</div>
      )}

      <div className="d-flex justify-content-between mt-4">
        <button className="btn btn-outline-secondary" onClick={onBack}>
          <i className="bi bi-arrow-left me-1"></i>পেছনে
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || !frontFile || disabled}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1"></span>
              প্রসেসিং...
            </>
          ) : (
            <>
              <i className="bi bi-scan me-1"></i>OCR স্ক্যান করুন
            </>
          )}
        </button>
      </div>
    </div>
  );
}
