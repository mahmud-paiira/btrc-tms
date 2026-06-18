import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

const API_URL = '/api';
const STATUS_BG = { pending: 'warning', active: 'success', suspended: 'danger', inactive: 'secondary' };
const APPROVAL_BG = { pending: 'warning', approved: 'success', rejected: 'danger' };
const STATUS_MAP = { pending: 'পেন্ডিং', active: 'সক্রিয়', suspended: 'স্থগিত', inactive: 'নিষ্ক্রিয়' };
const APPROVAL_MAP = { pending: 'পেন্ডিং', approved: 'অনুমোদিত', rejected: 'প্রত্যাখ্যাত' };

function imageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default function TrainerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/trainers/${id}/`);
        setTrainer(data);
      } catch {
        toast.error('প্রশিক্ষকের তথ্য লোড করতে ব্যর্থ');
        navigate('/center-admin/trainers');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm(`"${trainer.trainer_no}"-কে মুছে ফেলবেন?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/trainers/${id}/`);
      toast.success('মুছে ফেলা হয়েছে');
      navigate('/center-admin/trainers');
    } catch {
      toast.error('মুছতে ব্যর্থ');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    const t = trainer;
    const u = t.user || {};
    const w = window.open('', '_blank');
    if (!w) { toast.error('পপ-আপ ব্লকার অক্ষম করুন'); return; }
    w.document.write(`
      <html><head><title>প্রশিক্ষক - ${u.full_name_bn || t.trainer_no}</title>
      <style>
        body { font-family: 'NikoshBAN', 'SolaimanLipi', Arial, sans-serif; padding: 30px; color: #222; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a56db; padding-bottom: 15px; }
        .header h1 { font-size: 22px; margin: 0 0 5px; color: #1a56db; }
        .header p { font-size: 13px; color: #666; margin: 0; }
        .photo { text-align: center; margin-bottom: 25px; }
        .photo img { width: 120px; height: 120px; object-fit: cover; border-radius: 50%; border: 3px solid #1a56db; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
        .section-title { font-size: 15px; font-weight: bold; margin: 25px 0 12px; padding: 8px 12px; background: #1a56db; color: #fff; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        th { background: #f0f4ff; padding: 10px 12px; text-align: left; font-weight: 600; width: 200px; border: 1px solid #d0d9e8; color: #1a3a6b; }
        td { padding: 10px 12px; border: 1px solid #d0d9e8; }
        tr:nth-child(even) td { background: #fafcff; }
        .footer { text-align: center; margin-top: 25px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 15px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="header">
        <h1>প্রশিক্ষকের বিবরণ</h1>
        <p>প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
      </div>
      ${u.profile_image ? `<div class="photo"><img src="${imageUrl(u.profile_image)}" /></div>` : ''}
      <div class="section-title">ব্যক্তিগত তথ্য</div>
      <table>
        <tr><th>প্রশিক্ষক নং</th><td>${t.trainer_no}</td></tr>
        <tr><th>নাম (বাংলা)</th><td><strong>${u.full_name_bn || '—'}</strong></td></tr>
        <tr><th>নাম (ইংরেজি)</th><td>${u.full_name_en || '—'}</td></tr>
        <tr><th>ইমেইল</th><td>${u.email || '—'}</td></tr>
        <tr><th>ফোন</th><td>${u.phone || '—'}</td></tr>
        <tr><th>এনআইডি</th><td>${t.nid || '—'}</td></tr>
        <tr><th>জন্ম নিবন্ধন</th><td>${t.birth_certificate_no || '—'}</td></tr>
        <tr><th>জন্ম তারিখ</th><td>${t.date_of_birth || '—'}</td></tr>
      </table>
      <div class="section-title">পেশাগত তথ্য</div>
      <table>
        <tr><th>পিতার নাম</th><td>${t.father_name_bn || '—'}</td></tr>
        <tr><th>মাতার নাম</th><td>${t.mother_name_bn || '—'}</td></tr>
        <tr><th>শিক্ষাগত যোগ্যতা</th><td>${t.education_name || t.education_qualification || '—'}</td></tr>
        <tr><th>অভিজ্ঞতা</th><td>${t.years_of_experience ? t.years_of_experience + ' বছর' : '—'}</td></tr>
        <tr><th>দক্ষতার ক্ষেত্র</th><td>${t.expertise_area || '—'}</td></tr>
        <tr><th>ব্যাংক একাউন্ট</th><td>${t.bank_account_no || '—'}</td></tr>
        <tr><th>ব্যাংকের নাম</th><td>${t.bank_name || '—'}</td></tr>
      </table>
      <div class="footer">প্রশিক্ষকের বিবরণ - ${new Date().toLocaleDateString('bn-BD')}</div>
      <script>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!trainer) return null;

  const t = trainer;
  const u = t.user || {};

  return (
    <div className="px-4 py-4" ref={printRef}>
      <div className="d-flex align-items-center gap-3 mb-4 bg-white p-3 rounded shadow-sm">
        <button className="btn btn-outline-secondary btn-sm rounded-circle p-2" onClick={() => navigate('/center-admin/trainers')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        {u.profile_image ? (
          <img src={imageUrl(u.profile_image)} alt="ছবি" className="rounded-circle"
            style={{ width: 48, height: 48, objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center text-secondary"
            style={{ width: 48, height: 48, fontSize: 20 }}>
            <i className="bi bi-person"></i>
          </div>
        )}
        <div>
          <h4 className="mb-0 fw-bold">{u.full_name_bn || 'প্রশিক্ষক'}</h4>
          <div className="text-muted small">প্রশিক্ষক নং: {t.trainer_no}</div>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          <button className="btn btn-outline-primary btn-sm rounded-pill px-3" onClick={handlePrint} style={{ fontSize: 13 }}>
            <i className="bi bi-printer me-1"></i>প্রিন্ট
          </button>
          <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={handleDelete} disabled={deleting} style={{ fontSize: 13 }}>
            {deleting ? <><span className="spinner-border spinner-border-sm me-1" />মুছছে...</> : <><i className="bi bi-trash me-1"></i>মুছুন</>}
          </button>
          <span className={`badge bg-${STATUS_BG[t.status] || 'secondary'} fs-6 px-3 py-2`}>
            {STATUS_MAP[t.status] || t.status}
          </span>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-md-6">
              <h6 className="fw-bold mb-3 text-muted text-uppercase small">ব্যক্তিগত তথ্য</h6>
              <table className="table table-bordered align-middle">
                <tbody>
                  <tr><th className="bg-light" style={{ width: 160 }}>প্রোফাইল ছবি</th><td>{u.profile_image ? <img src={imageUrl(u.profile_image)} alt="ছবি" className="rounded-circle" style={{ width: 60, height: 60, objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} /> : '—'}</td></tr>
                  <tr><th className="bg-light" style={{ width: 160 }}>প্রশিক্ষক নং</th><td>{t.trainer_no}</td></tr>
                  <tr><th className="bg-light">নাম (বাংলা)</th><td>{u.full_name_bn || '—'}</td></tr>
                  <tr><th className="bg-light">নাম (ইংরেজি)</th><td>{u.full_name_en || '—'}</td></tr>
                  <tr><th className="bg-light">ইমেইল</th><td>{u.email || '—'}</td></tr>
                  <tr><th className="bg-light">ফোন</th><td>{u.phone || '—'}</td></tr>
                  <tr><th className="bg-light">এনআইডি</th><td>{t.nid || '—'}</td></tr>
                  <tr><th className="bg-light">জন্ম নিবন্ধন</th><td>{t.birth_certificate_no || '—'}</td></tr>
                  <tr><th className="bg-light">জন্ম তারিখ</th><td>{t.date_of_birth || '—'}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="col-md-6">
              <h6 className="fw-bold mb-3 text-muted text-uppercase small">পেশাগত তথ্য</h6>
              <table className="table table-bordered align-middle">
                <tbody>
                  <tr><th className="bg-light" style={{ width: 160 }}>পিতার নাম</th><td>{t.father_name_bn || '—'}</td></tr>
                  <tr><th className="bg-light">মাতার নাম</th><td>{t.mother_name_bn || '—'}</td></tr>
                  <tr><th className="bg-light">শিক্ষাগত যোগ্যতা</th><td>{t.education_name || t.education_qualification || '—'}</td></tr>
                  <tr><th className="bg-light">অভিজ্ঞতা</th><td>{t.years_of_experience ? `${t.years_of_experience} বছর` : '—'}</td></tr>
                  <tr><th className="bg-light">দক্ষতার ক্ষেত্র</th><td>{t.expertise_area || '—'}</td></tr>
                  <tr><th className="bg-light">ব্যাংক একাউন্ট</th><td>{t.bank_account_no || '—'}</td></tr>
                  <tr><th className="bg-light">ব্যাংকের নাম</th><td>{t.bank_name || '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <span className={`badge bg-${APPROVAL_BG[t.approval_status] || 'secondary'} fs-6 px-3 py-2`}>
              {APPROVAL_MAP[t.approval_status] || t.approval_status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

