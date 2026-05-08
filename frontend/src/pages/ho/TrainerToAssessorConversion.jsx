import React, { useState, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

export default function TrainerToAssessorConversion({ onClose, onDone }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [retain, setRetain] = useState(true);
  const [converting, setConverting] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const handleSearch = useCallback((q) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await hoService.searchConvertibleTrainers(q);
        setResults(res.data);
        setSearched(true);
      } catch { toast.error('সার্চ ব্যর্থ'); }
    }, 300);
  }, []);

  const handleConvert = async () => {
    if (!selected) return toast.warning('একজন প্রশিক্ষক নির্বাচন করুন');
    setConverting(true);
    try {
      const res = await hoService.convertTrainerToAssessor({
        trainer_id: selected.id,
        retain_trainer_status: retain,
      });
      toast.success(`রূপান্তর সফল! মূল্যায়নকারী নং: ${res.data.assessor_no}`);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.error || 'রূপান্তর ব্যর্থ হয়েছে');
    } finally { setConverting(false); }
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-warning text-dark">
            <h6 className="modal-title fw-semibold"><i className="bi bi-arrow-left-right me-2"></i>প্রশিক্ষক থেকে মূল্যায়নকারীতে রূপান্তর</h6>
            <button className="btn btn-sm btn-outline-dark" onClick={onClose}><i className="bi bi-x-lg"></i></button>
          </div>
          <div className="modal-body">
            <div className="alert alert-warning py-2" style={{ fontSize: 13 }}>
              <i className="bi bi-exclamation-triangle me-1"></i>
              একজন প্রশিক্ষককে মূল্যায়নকারী হিসেবে রূপান্তর করা হবে। সমস্ত তথ্য কপি করা হবে।
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">প্রশিক্ষক খুঁজুন (নাম, এনআইডি, ফোন)</label>
              <input className="form-control" placeholder="টাইপ করা শুরু করুন..." value={query}
                onChange={e => handleSearch(e.target.value)} />
            </div>

            {results.length > 0 && (
              <div className="mb-3">
                <label className="form-label fw-semibold">ফলাফল</label>
                <div className="list-group" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {results.map(t => (
                    <button key={t.id} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selected?.id === t.id ? 'active' : ''}`}
                      onClick={() => setSelected(t)} style={{ fontSize: 13 }}>
                      <div>
                        <strong>{t.trainer_no}</strong> - {t.name_bn || t.name_en || t.email}
                        <br /><small className="text-muted">এনআইডি: {t.nid} | ফোন: {t.phone} | অভিজ্ঞতা: {t.years_of_experience} বছর</small>
                      </div>
                      {selected?.id === t.id && <i className="bi bi-check-circle-fill text-white"></i>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {searched && results.length === 0 && (
              <div className="alert alert-info py-2" style={{ fontSize: 13 }}>
                <i className="bi bi-info-circle me-1"></i>রূপান্তরযোগ্য কোনো প্রশিক্ষক পাওয়া যায়নি
              </div>
            )}

            {selected && (
              <div className="card bg-light mb-3">
                <div className="card-body py-2" style={{ fontSize: 13 }}>
                  <strong>নির্বাচিত: </strong>
                  {selected.name_bn || selected.name_en} ({selected.trainer_no})<br />
                  <small className="text-muted">
                    এনআইডি: {selected.nid} | ফোন: {selected.phone} | দক্ষতা: {selected.expertise_area}
                  </small>
                </div>
              </div>
            )}

            <div className="form-check mb-2">
              <input className="form-check-input" type="checkbox" id="retainStatus"
                checked={retain} onChange={e => setRetain(e.target.checked)} />
              <label className="form-check-label" htmlFor="retainStatus">
                প্রশিক্ষক হিসেবেও রেখে দিন (টিক না দিলে প্রশিক্ষকের অবস্থা স্থগিত হবে)
              </label>
            </div>

            <div className="alert alert-danger py-2" style={{ fontSize: 12 }}>
              <i className="bi bi-exclamation-circle me-1"></i>
              সতর্কীকরণ: এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>বাতিল</button>
            <button className="btn btn-warning" onClick={handleConvert} disabled={!selected || converting}>
              {converting ? <><span className="spinner-border spinner-border-sm me-1"></span>রূপান্তর...</> : 'রূপান্তর করুন'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
