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

  printApplication(applicationNo) {
    return api.get(`/public/print/${applicationNo}/`, { responseType: 'blob' });
  },

  register(data) {
    return api.post('/public/auth/register/', data);
  },

  verifyOtp(data) {
    return api.post('/public/auth/verify-otp/', data);
  },

  loginPublic(data) {
    return api.post('/public/auth/login/', data);
  },

  resendOtp(data) {
    return api.post('/public/auth/resend-otp/', data);
  },

  checkUser(data) {
    return api.post('/public/auth/check-user/', data);
  },

  verifyNid(data) {
    return api.post('/public/verify-nid/', data);
  },

  // Master data (public, no auth needed)
  getGenders() {
    return api.get('/public/genders/');
  },

  getEducations() {
    return api.get('/public/educations/');
  },

  getDemographies() {
    return api.get('/public/demographies/');
  },
};

export default publicService;
