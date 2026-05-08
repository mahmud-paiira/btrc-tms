import api from './api';

const traineeService = {
  getMe() {
    return api.get('/trainee/me/');
  },

  getSchedule() {
    return api.get('/trainee/me/schedule/');
  },

  getAttendance(params) {
    return api.get('/trainee/me/attendance/', { params });
  },

  getAssessments() {
    return api.get('/trainee/me/assessments/');
  },

  getCertificate() {
    return api.get('/trainee/me/certificate/');
  },

  updateProfile(data) {
    return api.put('/trainee/me/profile/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  changePassword(data) {
    return api.post('/trainee/me/change-password/', data);
  },
};

export default traineeService;
