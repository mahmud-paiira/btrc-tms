import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import batchService from '../../services/batchService';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/dateFormatter';
import AddTraineeModal from '../../components/batches/AddTraineeModal';
import TransferModal from '../../components/batches/TransferModal';
import AssignTrainerModal from '../../components/batches/AssignTrainerModal';
import AssessorAssignmentCard from '../../components/batches/AssessorAssignmentCard';

const STATUS_BADGE = {
  scheduled: 'secondary',
  running: 'success',
  completed: 'primary',
  cancelled: 'danger',
};

export default function BatchDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const STATUS_MAP = {
    scheduled: t('batch.status.scheduled', 'নির্ধারিত'),
    running: t('batch.status.running', 'চলমান'),
    completed: t('batch.status.completed', 'সমাপ্ত'),
    cancelled: t('batch.status.cancelled', 'বাতিল'),
  };

  const { user } = useAuth();
  const isAdmin = user?.user_type === 'center_admin' || user?.user_type === 'head_office' || user?.is_superuser;
  const [batch, setBatch] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [showAssignTrainer, setShowAssignTrainer] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [batchRes, enrollRes] = await Promise.all([
        batchService.get(id),
        batchService.getEnrollments(id, { page_size: 100 }),
      ]);
      setBatch(batchRes.data);
      setEnrollments(enrollRes.data.results || enrollRes.data);
    } catch (err) {
      toast.error('ব্যাচের তথ্য লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    const w = window.open('', '_blank');
    if (!w) { toast.error('পপ-আপ ব্লকার অক্ষম করুন'); return; }
    const statusLabel = STATUS_MAP[batch.status] || batch.status;
    w.document.write(`
      <html><head><title>ব্যাচ বিবরণ</title>
      <style>
        body { font-family: 'NikoshBAN', 'SolaimanLipi', Arial, sans-serif; padding: 30px; color: #222; }
        .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #1a56db; padding-bottom: 15px; }
        .header h1 { font-size: 22px; margin: 0 0 5px; color: #1a56db; }
        .header p { font-size: 13px; color: #666; margin: 0; }
        .report-info { display: flex; justify-content: space-between; font-size: 12px; color: #888; margin-bottom: 15px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; font-size: 13px; }
        .info-grid .label { color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1a56db; color: #fff; padding: 10px 8px; text-align: left; font-weight: bold; }
        td { border: 1px solid #ddd; padding: 8px; }
        tr:nth-child(even) { background: #f8fafc; }
        tr:nth-child(odd) { background: #fff; }
        .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 15px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="header">
        <h1>ব্যাচ বিবরণ</h1>
        <p>প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
      </div>
      <div class="report-info">
        <span>প্রিন্টের তারিখ: ${new Date().toLocaleDateString('bn-BD')}</span>
      </div>
      <div class="info-grid">
        <div><span class="label">ব্যাচ নং:</span> <strong>${batch.batch_no}</strong></div>
        <div><span class="label">অবস্থা:</span> <strong>${statusLabel}</strong></div>
        <div><span class="label">নাম (বাংলা):</span> <strong>${batch.batch_name_bn || '-'}</strong></div>
        <div><span class="label">নাম (ইংরেজি):</span> <strong>${batch.batch_name_en || '-'}</strong></div>
        <div><span class="label">শিফট:</span> <strong>${batch.shift === 'shift_1' ? 'শিফট-১' : batch.shift === 'shift_2' ? 'শিফট-২' : '-'}</strong></div>
        <div><span class="label">কোর্স:</span> <strong>${batch.course_name}</strong></div>
        <div><span class="label">কেন্দ্র:</span> <strong>${batch.center_name || '-'}</strong></div>
        <div><span class="label">শুরুর তারিখ:</span> <strong>${batch.start_date || '-'}</strong></div>
        <div><span class="label">সমাপ্তির তারিখ:</span> <strong>${batch.end_date || '-'}</strong></div>
        <div><span class="label">আসন:</span> <strong>${batch.filled_seats || 0} / ${batch.total_seats || 0}</strong></div>
      </div>
      <table>
        <tr><th>ক্রমিক</th><th>রেজি. নং</th><th>নাম</th><th>মোবাইল</th><th>শিফট</th><th>নথিভুক্তির তারিখ</th><th>অবস্থা</th></tr>
        ${enrollments.length === 0 ? '<tr><td colspan="7" style="text-align:center">কোনো প্রশিক্ষণার্থী নথিভুক্ত নন</td></tr>' : enrollments.map((e, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${e.trainee_reg_no || '-'}</td>
            <td>${e.trainee_name || '-'}</td>
            <td>${e.trainee_phone || '-'}</td>
            <td>${e.batch_shift || '-'}</td>
            <td>${e.enrollment_date || '-'}</td>
            <td>${e.status === 'active' ? 'সক্রিয়' : e.status === 'completed' ? 'সমাপ্ত' : e.status === 'dropped' ? 'বাতিল' : e.status}</td>
          </tr>
        `).join('')}
      </table>
      <div class="footer">ব্যাচ বিবরণ - ${new Date().toLocaleDateString('bn-BD')}</div>
      <script>window.print();</script>
      </body></html>
    `);
    w.document.close();
  }

  function esc(val) {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function handleExport(fmt = 'csv') {
    const header = 'ক্রমিক,রেজি. নং,নাম,মোবাইল,শিফট,নথিভুক্তির তারিখ,অবস্থা';
    const rows = enrollments.map((e, i) =>
      [i + 1, esc(e.trainee_reg_no || '-'), esc(e.trainee_name || '-'), esc(e.trainee_phone || '-'),
        esc(e.batch_shift || '-'), esc(e.enrollment_date || '-'),
        esc(e.status === 'active' ? 'সক্রিয়' : e.status === 'completed' ? 'সমাপ্ত' : e.status === 'dropped' ? 'বাতিল' : e.status)
      ].join(',')
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_${batch.batch_no}_enrollments_${new Date().toISOString().slice(0, 10)}.${fmt}`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('এক্সপোর্ট সম্পন্ন');
  }

  async function handleAction(action) {
    try {
      setActionLoading(action);
      const res = await batchService[action](id);
      setBatch(res.data);
      toast.success(
        action === 'start' ? 'ব্যাচ শুরু করা হয়েছে।' :
        action === 'complete' ? 'ব্যাচ সমাপ্ত করা হয়েছে।' :
        action === 'cancel' ? 'ব্যাচ বাতিল করা হয়েছে।' : ''
      );
    } catch (err) {
      const msg = err.response?.data?.error || 'কাজটি সম্পাদন করতে ব্যর্থ হয়েছে।';
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDrop(enrollmentId) {
    if (!window.confirm('প্রশিক্ষণার্থীকে ব্যাচ থেকে বাদ দেবেন?')) return;
    try {
      await batchService.dropEnrollment(enrollmentId);
      toast.success('বাদ দেওয়া হয়েছে।');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ব্যর্থ হয়েছে।');
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (!batch) {
    return <div className="alert alert-danger">ব্যাচ পাওয়া যায়নি।</div>;
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="m-0 fw-bold">
          {batch.batch_name_bn || batch.batch_name_en || batch.batch_no}
        </h4>
        <div>
          <button className="btn btn-outline-secondary btn-sm me-2" onClick={() => navigate(-1)}>
            পেছনে
          </button>
          {isAdmin && (
            <Link className="btn btn-outline-primary btn-sm" to={`/center-admin/batches/${id}/edit`}>
              সম্পাদনা
            </Link>
          )}
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-8">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="fw-bold">ব্যাচের তথ্য</span>
              <span className={`badge bg-${STATUS_BADGE[batch.status]} fs-6`}>
                {STATUS_MAP[batch.status] || batch.status}
              </span>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-sm-6 mb-2">
                  <small className="text-muted d-block">ব্যাচ নং</small>
                  <strong>{batch.batch_no}</strong>
                </div>
                <div className="col-sm-6 mb-2">
                  <small className="text-muted d-block">নাম (বাংলা)</small>
                  <strong>{batch.batch_name_bn || '-'}</strong>
                </div>
                <div className="col-sm-6 mb-2">
                  <small className="text-muted d-block">নাম (ইংরেজি)</small>
                  <strong>{batch.batch_name_en || '-'}</strong>
                </div>
                <div className="col-sm-6 mb-2">
                  <small className="text-muted d-block">শিফট</small>
                  <strong>{batch.shift === 'shift_1' ? 'শিফট-১ (সকাল ৯টা-দুপুর ১টা)' : batch.shift === 'shift_2' ? 'শিফট-২ (দুপুর ২টা-সন্ধ্যা ৬টা)' : '-'}</strong>
                </div>
                <div className="col-sm-6 mb-2">
                  <small className="text-muted d-block">কোর্স</small>
                  <strong>{batch.course_name}</strong>
                </div>
                <div className="col-sm-6 mb-2">
                  <small className="text-muted d-block">শুরুর তারিখ</small>
                  <strong>{batch.start_date ? formatDate(batch.start_date) : '-'}</strong>
                </div>
                <div className="col-sm-6 mb-2">
                  <small className="text-muted d-block">সমাপ্তির তারিখ</small>
                  <strong>{batch.end_date ? formatDate(batch.end_date) : '-'}</strong>
                </div>
                <div className="col-sm-6 mb-2">
                  <small className="text-muted d-block">আসন</small>
                  <strong>{batch.filled_seats || 0} / {batch.total_seats || 0}</strong>
                </div>
                <div className="col-sm-6 mb-2">
                  <small className="text-muted d-block">কোর্সের মোট ঘন্টা</small>
                  <strong>{batch.course_duration_hours || '-'} ঘন্টা</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-header fw-bold">কেন্দ্র ও সার্কুলার</div>
            <div className="card-body">
              <div className="mb-2">
                <small className="text-muted d-block">প্রশিক্ষণ কেন্দ্র</small>
                <strong>{batch.center_name || '-'}</strong>
                {batch.center_code && <span className="text-muted ms-1">({batch.center_code})</span>}
              </div>
              <div className="mb-2">
                <small className="text-muted d-block">সার্কুলার</small>
                <strong>{batch.circular_title || '-'}</strong>
              </div>
              <div className="mb-2">
                <small className="text-muted d-block">প্রশিক্ষণ শুরুর তারিখ</small>
                <strong>{batch.circular_training_start ? formatDate(batch.circular_training_start) : '-'}</strong>
              </div>
              <div className="mb-2">
                <small className="text-muted d-block">তৈরি করেছেন</small>
                <strong>{batch.created_by_name || '-'}</strong>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="card mt-3">
              <div className="card-header fw-bold">অ্যাকশন</div>
              <div className="card-body d-flex flex-wrap gap-2">
                {batch.status === 'scheduled' && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleAction('start')}
                    disabled={actionLoading === 'start'}
                  >
                    {actionLoading === 'start' ? 'প্রক্রিয়াধীন...' : 'শুরু করুন'}
                  </button>
                )}
                {(batch.status === 'running' || batch.status === 'scheduled') && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAction('complete')}
                    disabled={actionLoading === 'complete'}
                  >
                    {actionLoading === 'complete' ? 'প্রক্রিয়াধীন...' : 'সমাপ্ত করুন'}
                  </button>
                )}
                {(batch.status === 'scheduled' || batch.status === 'running') && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleAction('cancel')}
                    disabled={actionLoading === 'cancel'}
                  >
                    {actionLoading === 'cancel' ? 'প্রক্রিয়াধীন...' : 'বাতিল করুন'}
                  </button>
                )}
                <Link className="btn btn-info btn-sm text-white" to={`/center-admin/attendance/batch/${id}`}>
                  উপস্থিতি
                </Link>
                <button
                  className="btn btn-outline-info btn-sm"
                  onClick={() => handleAction('generateCalendar')}
                  disabled={actionLoading === 'generateCalendar'}
                >
                  {actionLoading === 'generateCalendar' ? 'প্রক্রিয়াধীন...' : 'ক্যালেন্ডার জেনারেট'}
                </button>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => setShowAssignTrainer(true)}
                >
                  প্রশিক্ষক নিয়োগ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span className="fw-bold">নথিভুক্ত প্রশিক্ষণার্থী ({enrollments.length})</span>
          <div className="d-flex gap-2">
            {isAdmin && (
              <button className="btn btn-sm btn-primary" onClick={() => setShowAddModal(true)}>
                <i className="bi bi-plus-lg me-1"></i>যোগ করুন
              </button>
            )}
            <button className="btn btn-sm btn-secondary" onClick={handlePrint}>
              <i className="bi bi-printer me-1"></i>প্রিন্ট
            </button>
            <button className="btn btn-sm btn-success" onClick={() => handleExport('csv')}>
              <i className="bi bi-download me-1"></i>এক্সপোর্ট
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>রেজি. নং</th>
                  <th>নাম</th>
                  <th>মোবাইল</th>
                  <th>শিফট</th>
                  <th>নথিভুক্তির তারিখ</th>
                  <th>অবস্থা</th>
                  {isAdmin && <th>অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody>
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="text-center text-muted py-4">
                      কোনো প্রশিক্ষণার্থী নথিভুক্ত নন।
                    </td>
                  </tr>
                ) : enrollments.map((e, i) => (
                  <tr key={e.id}>
                    <td>{i + 1}</td>
                    <td>{e.trainee_reg_no || '-'}</td>
                    <td>{e.trainee_name || '-'}</td>
                    <td>{e.trainee_phone || '-'}</td>
                    <td>{e.batch_shift || '-'}</td>
                    <td>{formatDate(e.enrollment_date)}</td>
                    <td>
                      <span className={`badge bg-${e.status === 'active' ? 'success' : e.status === 'completed' ? 'primary' : e.status === 'dropped' ? 'danger' : 'secondary'}`}>
                        {e.status === 'active' ? 'সক্রিয়' : e.status === 'completed' ? 'সমাপ্ত' : e.status === 'dropped' ? 'বাতিল' : e.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {e.status === 'active' && (
                          <>
                            <button
                              className="btn btn-sm btn-outline-warning me-1"
                              onClick={() => setTransferTarget({ enrollmentId: e.id, batchId: id })}
                              title="স্থানান্তর"
                            >
                              <i className="bi bi-arrow-left-right"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDrop(e.id)}
                              title="বাদ দিন"
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <AssessorAssignmentCard batchId={id} batch={batch} />
      </div>

      {showAddModal && (
        <AddTraineeModal
          batchId={id}
          onAdded={loadData}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {transferTarget && (
        <TransferModal
          enrollmentId={transferTarget.enrollmentId}
          currentBatchId={transferTarget.batchId}
          onTransferred={loadData}
          onClose={() => setTransferTarget(null)}
        />
      )}
      {showAssignTrainer && (
        <AssignTrainerModal
          batchId={id}
          onAssigned={loadData}
          onClose={() => setShowAssignTrainer(false)}
        />
      )}
    </div>
  );
}
