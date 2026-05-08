import api from './api';

const attendanceService = {
  getBatchCalendar(batchId) {
    return api.get(`/center/attendance/batch/${batchId}/`);
  },

  markAttendance(data) {
    return api.post('/center/attendance/mark/', data);
  },

  getEligibility(batchId, threshold = 80) {
    return api.get(`/center/attendance/eligibility/${batchId}/`, {
      params: { threshold },
    });
  },

  getSummary(batchId) {
    return api.get(`/center/attendance/summary/${batchId}/`);
  },

  getBatchDetail(batchId) {
    return api.get(`/batches/batches/${batchId}/`);
  },

  getWeekPlans(batchId) {
    return api.get(`/batches/batches/${batchId}/week_plans/`);
  },

  getBatchEnrollments(batchId) {
    return api.get(`/batches/enrollments/`, { params: { batch: batchId } });
  },

  getSessionQRUrl(batchId, sessionDate, sessionNo) {
    return `/api/center/attendance/qr/?batch_id=${batchId}&session_date=${sessionDate}&session_no=${sessionNo}`;
  },
};

export default attendanceService;
