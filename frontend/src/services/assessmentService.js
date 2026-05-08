import api from './api';

const assessmentService = {
  getBatchEligible(batchId) {
    return api.get(`/center/assessment/batch/${batchId}/eligible/`);
  },

  conductAssessment(data) {
    return api.post('/center/assessment/conduct/', data);
  },

  getBatchResults(batchId) {
    return api.get(`/center/assessment/batch/${batchId}/results/`);
  },

  requestReassessment(data) {
    return api.post('/center/assessment/reassessment/request/', data);
  },

  getReassessmentRequests(params) {
    return api.get('/center/assessment/reassessment/requests/', { params });
  },

  getTraineeResults(traineeId) {
    return api.get(`/assessments/trainee-results/${traineeId}/`);
  },

  getBatchDetail(batchId) {
    return api.get(`/batches/batches/${batchId}/`);
  },

  getBatchEnrollments(batchId) {
    return api.get('/batches/enrollments/', { params: { batch: batchId } });
  },
};

export default assessmentService;
