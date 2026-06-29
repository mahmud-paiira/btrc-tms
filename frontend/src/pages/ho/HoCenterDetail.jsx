import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

const STATUS_MAP = { active: 'সক্রিয়', suspended: 'স্থগিত' };
const STATUS_BG = { active: 'success', suspended: 'warning' };

function StatsCard({ label, value, color, icon }) {
  return (
    <div className={`card text-bg-${color} shadow-sm border-0`}>
      <div className="card-body d-flex align-items-center gap-3 py-3">
        <i className={`bi ${icon} fs-2`}></i>
        <div>
          <h5 className="mb-0 fw-bold">{value}</h5>
          <small>{label}</small>
        </div>
      </div>
    </div>
  );
}

export default function HoCenterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [center, setCenter] = useState(null);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [infra, setInfra] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        toast.error('সার্ভার থেকে সাড়া মিলেনি');
        navigate('/ho/centers');
      }
    }, 15000);

    const load = async () => {
      setLoading(true);
      try {
        const centerRes = await hoService.getCenter(id);
        if (cancelled) return;
        setCenter(centerRes.data);

        const [s, i, e] = await Promise.all([
          hoService.getCenterStats(id).then((r) => r.data).catch(() => null),
          hoService.getCenterInfrastructure(id).then((r) => r.data).catch(() => []),
          hoService.getCenterEmployees(id).then((r) => r.data).catch(() => []),
        ]);
        if (cancelled) return;
        setStats(s);
        setInfra(Array.isArray(i) ? i : []);
        setEmployees(Array.isArray(e) ? e : []);
      } catch {
        if (!cancelled) {
          toast.error('কেন্দ্রের বিস্তারিত লোড করতে ব্যর্থ');
          navigate('/ho/centers');
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!center) return null;

  return (
    <div className="px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4 bg-white p-3 rounded shadow-sm">
        <button className="btn btn-outline-secondary btn-sm rounded-circle p-2" onClick={() => navigate('/ho/centers')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h4 className="mb-0 fw-bold">{center.name_bn}</h4>
          <div className="text-muted small">কেন্দ্র কোড: {center.code}</div>
        </div>
        <div className="ms-auto">
           <span className={`status-dot dot-${STATUS_BG[center.status] || 'secondary'}`}>
             {STATUS_MAP[center.status] || center.status}
           </span>
        </div>
      </div>

      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3"><StatsCard label="মোট প্রশিক্ষণার্থী" value={stats.trainee_count} color="primary" icon="bi-people" /></div>
          <div className="col-md-3"><StatsCard label="সক্রিয় ব্যাচ" value={stats.active_batch_count} color="success" icon="bi-layers" /></div>
          <div className="col-md-3"><StatsCard label="উপস্থিতির হার" value={`${stats.attendance_rate}%`} color="info" icon="bi-graph-up" /></div>
          <div className="col-md-3"><StatsCard label="চাকরি স্থাপনের হার" value={`${stats.placement_rate}%`} color="warning" icon="bi-briefcase" /></div>
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white pt-3 border-0">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item"><button className={`nav-link ${tab === 'overview' ? 'active fw-bold' : ''}`} onClick={() => setTab('overview')}><i className="bi bi-info-circle me-1"></i>সারাংশ</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === 'infrastructure' ? 'active fw-bold' : ''}`} onClick={() => setTab('infrastructure')}><i className="bi bi-buildings me-1"></i>অবকাঠামো</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === 'employees' ? 'active fw-bold' : ''}`} onClick={() => setTab('employees')}><i className="bi bi-people me-1"></i>কর্মচারী</button></li>
            <li className="nav-item"><button className={`nav-link ${tab === 'performance' ? 'active fw-bold' : ''}`} onClick={() => setTab('performance')}><i className="bi bi-graph-up me-1"></i>কর্মক্ষমতা</button></li>
          </ul>
        </div>
        <div className="card-body p-4">
          {tab === 'overview' && (
            <div className="row g-4">
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">মূল তথ্য</h6>
                <table className="b-detail-table w-100">
                  <tbody>
                    <tr><th >কোড</th><td>{center.code}</td></tr>
                    <tr><th >নাম (বাংলা)</th><td>{center.name_bn}</td></tr>
                    <tr><th >নাম (ইংরেজি)</th><td>{center.name_en || '—'}</td></tr>
                    <tr><th >ফোন</th><td>{center.phone || '—'}</td></tr>
                    <tr><th >ইমেইল</th><td>{center.email || '—'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">যোগাযোগ ও স্থিতি</h6>
                <table className="b-detail-table w-100">
                  <tbody>
                    <tr><th >ঠিকানা</th><td>{center.address || '—'}</td></tr>
                    <tr><th >যোগাযোগ ব্যক্তি</th><td>{center.contact_person_name || '—'}</td></tr>
                    <tr><th >যোগাযোগ মোবাইল</th><td>{center.contact_person_phone || '—'}</td></tr>
                    <tr><th >তৈরির তারিখ</th><td>{center.created_at ? new Date(center.created_at).toLocaleDateString('bn-BD') : '—'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'infrastructure' && (
            <div className="table-responsive">
              <table className="b-detail-table w-100">
                <thead >
                  <tr><th>কক্ষ নং</th><th>অবস্থান</th><th>ধারণক্ষমতা</th><th>সরঞ্জাম</th><th>স্ট্যাটাস</th></tr>
                </thead>
                <tbody>
                  {infra.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted py-4">কোন কক্ষ পাওয়া যায়নি</td></tr>
                  ) : infra.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-bold">{r.room_no}</td>
                      <td>{r.location_bn || r.location_en || '—'}</td>
                      <td>{r.capacity} জন</td>
                      <td style={{ maxWidth: 300 }}>{r.equipment || '—'}</td>
                      <td><span className={`status-dot dot-${r.status === 'available' ? 'success' : r.status === 'maintenance' ? 'warning' : 'danger'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'employees' && (
            <div className="table-responsive">
              <table className="b-detail-table w-100">
                <thead >
                  <tr><th>কর্মচারী নং</th><th>নাম</th><th>পদবী</th><th>যোগাযোগ</th><th>স্ট্যাটাস</th></tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted py-4">কোন কর্মচারী নেই</td></tr>
                  ) : employees.map((e) => (
                    <tr key={e.id}>
                      <td className="fw-bold">{e.employee_no}</td>
                      <td>{e.user_full_name_bn || e.user_email || '—'}</td>
                      <td>{e.designation_bn || '—'}</td>
                      <td>{e.user_email || '—'}</td>
                      <td><span className={`status-dot dot-${e.status === 'active' ? 'success' : 'secondary'}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'performance' && stats && (
            <div>
              <div className="row g-3 mb-4">
                {[
                  { label: 'মোট ব্যাচ', value: stats.total_batches, color: 'primary' },
                  { label: 'চলমান ব্যাচ', value: stats.running_batches, color: 'success' },
                  { label: 'সমাপ্ত ব্যাচ', value: stats.completed_batches, color: 'info' },
                  { label: 'নথিভুক্ত', value: stats.enrolled_trainees, color: 'warning' },
                  { label: 'ঝরে পড়া', value: stats.dropped_trainees, color: 'danger' },
                  { label: 'সফল সমাপ্তি', value: stats.completed_trainees, color: 'success' },
                ].map((s, idx) => (
                  <div className="col-md-4 col-lg-2" key={idx}>
                    <div className={`card bg-${s.color} bg-opacity-10 border-${s.color} h-100 text-center py-3`}>
                      <div className={`fw-bold fs-4 text-${s.color}`}>{s.value}</div>
                      <small className="text-muted">{s.label}</small>
                    </div>
                  </div>
                ))}
              </div>

              {stats.monthly_enrollment?.length > 0 && (
                <div className="mt-4 p-4 bg-light rounded-4">
                  <h6 className="fw-bold mb-4"><i className="bi bi-bar-chart-fill me-2 text-primary"></i>মাসিক নথিভুক্তি (গত ১২ মাস)</h6>
                  <div className="d-flex align-items-end gap-2" style={{ height: 200, paddingBottom: 30 }}>
                    {stats.monthly_enrollment.map((m) => {
                      const max = Math.max(...stats.monthly_enrollment.map((x) => x.count), 1);
                      const pct = (m.count / max) * 100;
                      return (
                        <div key={m.month} className="d-flex flex-column align-items-center flex-fill">
                          <small className="mb-2 fw-bold text-primary" style={{ fontSize: 10 }}>{m.count}</small>
                          <div className="bg-primary rounded-top" style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: 'linear-gradient(to top, var(--bs-primary), #818cf8)' }} title={m.month} />
                          <small className="mt-2 text-muted" style={{ fontSize: 10, transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{m.month.slice(5)}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
