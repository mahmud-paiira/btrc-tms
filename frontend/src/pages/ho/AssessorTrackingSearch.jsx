import React, { useState } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

const SEARCH_TYPES = [
  { key: 'assessor_no', label: 'মূল্যায়নকারী নং' },
  { key: 'nid', label: 'এনআইডি' },
  { key: 'mobile', label: 'মোবাইল' },
  { key: 'bcn', label: 'জন্ম নিবন্ধন' },
];

export default function AssessorTrackingSearch() {
  const [searchType, setSearchType] = useState('assessor_no');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return toast.warning('সার্চ টার্ম লিখুন');
    setLoading(true);
    setSearched(true);
    try {
      let res;
      switch (searchType) {
        case 'assessor_no': res = await hoService.trackAssessorByNumber(query); break;
        case 'nid': res = await hoService.trackAssessorByNid(query); break;
        case 'mobile': res = await hoService.trackAssessorByMobile(query); break;
        case 'bcn': res = await hoService.trackAssessorByBcn(query); break;
        default: return;
      }
      setResult(res.data);
    } catch (e) {
      if (e.response?.status === 404) setResult(null);
      else toast.error('সার্চ ব্যর্থ হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white py-2">
        <h6 className="mb-0 fw-semibold" style={{ fontSize: 14 }}>মূল্যায়নকারী ট্র্যাকিং</h6>
      </div>
      <div className="card-body">
        <div className="row g-2 mb-3">
          <div className="col-md-4">
            <select className="form-select form-select-sm" value={searchType} onChange={e => setSearchType(e.target.value)}>
              {SEARCH_TYPES.map(st => <option key={st.key} value={st.key}>{st.label}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <input className="form-control form-control-sm" placeholder={`${SEARCH_TYPES.find(st => st.key === searchType)?.label} লিখুন...`}
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary btn-sm w-100" onClick={handleSearch} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-search me-1"></i>সার্চ</>}
            </button>
          </div>
        </div>

        {searched && !loading && (
          <div>
            {result ? (
              <div className="table-responsive">
                <table className="table table-bordered table-sm" style={{ fontSize: 13 }}>
                  <tbody>
                    <tr><td className="fw-semibold" style={{ width: 160 }}>মূল্যায়নকারী নং</td><td>{result.assessor_no}</td></tr>
                    <tr><td className="fw-semibold">নাম</td><td>{result.user?.full_name_bn || result.user?.full_name_en || '-'}</td></tr>
                    <tr><td className="fw-semibold">ইমেইল</td><td>{result.user?.email || '-'}</td></tr>
                    <tr><td className="fw-semibold">ফোন</td><td>{result.user?.phone || '-'}</td></tr>
                    <tr><td className="fw-semibold">এনআইডি</td><td>{result.nid}</td></tr>
                    <tr><td className="fw-semibold">জন্ম তারিখ</td><td>{result.date_of_birth || '-'}</td></tr>
                    <tr><td className="fw-semibold">অভিজ্ঞতা</td><td>{result.years_of_experience} বছর</td></tr>
                    <tr><td className="fw-semibold">অবস্থা</td><td>{result.status}</td></tr>
                    <tr><td className="fw-semibold">অনুমোদন</td><td>{result.approval_status}</td></tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info py-2 mb-0" style={{ fontSize: 13 }}>
                <i className="bi bi-info-circle me-1"></i>কোনো মূল্যায়নকারী পাওয়া যায়নি
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
