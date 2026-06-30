import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import batchService from '../../services/batchService';
import AssignAssessorModal from './AssignAssessorModal';

export default function AssessorAssignmentCard({ batchId, batch }) {
  const [assessors, setAssessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchAssessor = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/batches/batches/${batchId}/assessor/`);
      setAssessors(data.assessors || []);
    } catch {
      setAssessors([]);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { fetchAssessor(); }, [fetchAssessor]);

  const handleRemove = async (assessorId) => {
    if (!confirm('মূল্যায়নকারীকে সরাবেন?')) return;
    try {
      await batchService.removeAssessor(batchId, { assessor_id: assessorId });
      toast.success('মূল্যায়নকারী সরানো হয়েছে');
      fetchAssessor();
    } catch (err) {
      toast.error(err.response?.data?.error || 'সরাতে ব্যর্থ');
    }
  };

  return (
    <>
      <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
          <h6 className="mb-0"><i className="bi bi-person-check me-2"></i>মূল্যায়নকারী</h6>
          <button className="btn btn-sm btn-outline-light" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-lg me-1"></i>নিয়োগ
          </button>
        </div>
        <div className="card-body p-3">
          {loading ? (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-success" role="status" />
              <p className="mt-2 text-muted small">লোড হচ্ছে...</p>
            </div>
          ) : assessors.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-person-plus display-6 d-block mb-2"></i>
              <p className="mb-0">কোনো মূল্যায়নকারী নিয়োগ দেওয়া হয়নি</p>
              <small>উপরে "নিয়োগ" বাটনে ক্লিক করে মূল্যায়নকারী নির্ধারণ করুন</small>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered mb-0 align-middle">
                <thead className="table-success">
                  <tr>
                    <th>#</th>
                    <th>মূল্যায়নকারীর নাম</th>
                    <th>আইডি</th>
                    <th style={{ width: 60 }}>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {assessors.map((a, i) => (
                    <tr key={a.assessor_id}>
                      <td>{i + 1}</td>
                      <td>{a.assessor_name}</td>
                      <td>{a.assessor_no}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemove(a.assessor_id)}
                          title="সরান"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {batch && (
          <div className="card-footer bg-white small text-muted py-2">
            কেন্দ্র: {batch.center_name || batch.center} | কোর্স: {batch.course_name || batch.course}
          </div>
        )}
      </div>

      {showModal && (
        <AssignAssessorModal
          batchId={batchId}
          onAssigned={fetchAssessor}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
