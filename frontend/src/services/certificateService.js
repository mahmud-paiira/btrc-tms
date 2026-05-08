import api from './api';

const certificateService = {
  getBatchEligible(batchId) {
    return api.get(`/center/certificates/eligible/${batchId}/`);
  },

  issueCertificate(data) {
    return api.post('/center/certificates/issue/', data);
  },

  batchIssue(data) {
    return api.post('/center/certificates/batch-issue/', data);
  },

  listCertificates(params) {
    return api.get('/center/certificates/list/', { params });
  },

  getTaskStatus(taskId) {
    return api.get(`/center/certificates/task-status/${taskId}/`);
  },

  listZips(params) {
    return api.get('/center/certificates/zips/', { params });
  },

  verifyPublic(certNo) {
    return api.get(`/public/verify-certificate/${certNo}/`);
  },

  downloadPdf(certNo) {
    return api.get(`/certificates/download/${certNo}/`, {
      responseType: 'blob',
    });
  },
};

export default certificateService;
