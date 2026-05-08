import React, { useState, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';

export default function BulkUserImport({ show, onClose, onImported }) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendWelcome, setSendWelcome] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [results, setResults] = useState(null);

  const handleImport = async () => {
    if (!file) { toast.warning(t('users.selectFile', 'ফাইল নির্বাচন করুন')); return; }
    setLoading(true);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('send_welcome', sendWelcome);
      formData.append('update_existing', updateExisting);
      const res = await hoService.importHOUsers(formData);
      setResults(res.data);
      if (res.data.created > 0 || res.data.updated > 0) {
        toast.success(t('users.importSuccess', `${res.data.created} created, ${res.data.updated} updated`));
        onImported();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || t('users.importError', 'ইম্পোর্ট ব্যর্থ');
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Modal show={show} onHide={onClose} centered size="md">
      <Modal.Header closeButton>
        <Modal.Title><i className="bi bi-upload me-2"></i>{t('users.bulkImport', 'বাল্ক ইম্পোর্ট')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="border rounded-3 p-4 bg-light mb-3">
          <div className="mb-3">
            <input ref={fileRef} type="file" className="form-control"
              accept=".csv,.xlsx" onChange={e => setFile(e.target.files[0] || null)} />
            <small className="text-secondary">{t('users.fileHelp', 'Excel (.xlsx) বা CSV ফাইল আপলোড করুন')}</small>
          </div>

          <div className="mb-2">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="sendWelcome"
                checked={sendWelcome} onChange={e => setSendWelcome(e.target.checked)} />
              <label className="form-check-label" htmlFor="sendWelcome">
                {t('users.sendWelcome', 'স্বাগতম ইমেইল পাঠান')}
              </label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="updateExisting"
                checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)} />
              <label className="form-check-label" htmlFor="updateExisting">
                {t('users.updateExisting', 'বিদ্যমান ব্যবহারকারী আপডেট করুন')}
              </label>
            </div>
          </div>

          <button className="btn btn-primary w-100 mt-2" onClick={handleImport} disabled={loading || !file}>
            {loading ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-cloud-upload me-1"></i>}
            {t('users.import', 'ইম্পোর্ট')}
          </button>
        </div>

        {results && (
          <div>
            <h6 className="fw-bold">{t('users.importResults', 'ইম্পোর্ট ফলাফল')}</h6>
            <div className="d-flex gap-3 mb-2">
              <div className="badge bg-success fs-6">{t('users.created', 'তৈরি')}: {results.created}</div>
              <div className="badge bg-info fs-6">{t('common.updated', 'আপডেট')}: {results.updated}</div>
            </div>
            {results.errors && results.errors.length > 0 && (
              <div className="border rounded p-2 bg-danger bg-opacity-10" style={{ maxHeight: 200, overflowY: 'auto' }}>
                <small className="text-danger fw-bold">{t('users.errors', 'ত্রুটি')}:</small>
                {results.errors.map((err, i) => (
                  <div key={i} style={{ fontSize: 11 }} className="text-danger">{err}</div>
                ))}
              </div>
            )}
            <button className="btn btn-outline-secondary btn-sm w-100 mt-2" onClick={handleReset}>
              <i className="bi bi-arrow-counterclockwise me-1"></i>{t('common.reset', 'রিসেট')}
            </button>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>{t('common.close', 'বন্ধ')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
