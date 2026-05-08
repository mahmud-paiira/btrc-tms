import api from './api';

const jobService = {
  createJob(data) {
    return api.post('/center/jobs/create/', data);
  },

  listJobs(params) {
    return api.get('/center/jobs/list/', { params });
  },

  releaseJob(id, data) {
    return api.put(`/center/jobs/${id}/release/`, data);
  },

  getBatchSummary(batchId) {
    return api.get(`/center/jobs/batch-summary/${batchId}/`);
  },

  exportBatchSummary(batchId) {
    return api.get(`/center/jobs/batch-summary/${batchId}/export/`, {
      responseType: 'blob',
    });
  },

  addTracking(data) {
    return api.post('/center/jobs/tracking/', data);
  },

  getPlacementTrackings(placementId) {
    return api.get(`/center/jobs/trackings/${placementId}/`);
  },

  getCertifiedTrainees(batchId) {
    return api.get(`/center/certificates/eligible/${batchId}/`);
  },

  getBatches(params) {
    return api.get('/batches/batches/', { params });
  },
};

export default jobService;
