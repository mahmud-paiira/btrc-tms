import api from './api';

const batchService = {
  list(params) {
    return api.get('/batches/batches/', { params });
  },

  get(id) {
    return api.get(`/batches/batches/${id}/`);
  },

  create(data) {
    return api.post('/batches/batches/', data);
  },

  update(id, data) {
    return api.put(`/batches/batches/${id}/`, data);
  },

  delete(id) {
    return api.delete(`/batches/batches/${id}/`);
  },

  getWeekPlans(id) {
    return api.get(`/batches/batches/${id}/week_plans/`);
  },

  addWeekPlan(id, data) {
    return api.post(`/batches/batches/${id}/add_week_plan/`, data);
  },

  bulkAddWeekPlans(id, data) {
    return api.post(`/batches/batches/${id}/bulk_add_week_plans/`, data);
  },

  validateHours(id) {
    return api.get(`/batches/batches/${id}/validate_hours/`);
  },

  getEnrollments(id, params) {
    return api.get(`/batches/batches/${id}/enrollments/`, { params });
  },

  enrollTrainees(id, data) {
    return api.post(`/batches/batches/${id}/enroll_trainees/`, data);
  },

  start(id) {
    return api.post(`/batches/batches/${id}/start/`);
  },

  complete(id) {
    return api.post(`/batches/batches/${id}/complete/`);
  },

  cancel(id) {
    return api.post(`/batches/batches/${id}/cancel/`);
  },
};

export default batchService;
