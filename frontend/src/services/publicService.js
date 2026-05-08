import api from './api';

const publicService = {
  ocrExtract(formData) {
    return api.post('/public/ocr/extract/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  checkNid(nid) {
    return api.get(`/public/check-nid/${nid}/`);
  },

  submitApplication(formData) {
    return api.post('/public/apply/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default publicService;
