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
    return api.patch(`/batches/batches/${id}/`, data);
  },

  delete(id) {
    return api.delete(`/batches/batches/${id}/`);
  },

  myBatches(params) {
    return api.get('/batches/batches/my_batches/', { params });
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

  generate(data) {
    return api.post('/batches/batches/generate/', data);
  },

  generateCalendar(id) {
    return api.post(`/batches/batches/${id}/generate_calendar/`);
  },

  addTrainee(id, data) {
    return api.post(`/batches/batches/${id}/add_trainee/`, data);
  },

  assignTrainer(id, data) {
    return api.post(`/batches/batches/${id}/assign_trainer/`, data);
  },

  assignAssessor(id, data) {
    return api.post(`/batches/batches/${id}/assign_assessor/`, data);
  },

  removeAssessor(id, data) {
    return api.post(`/batches/batches/${id}/remove_assessor/`, data);
  },

  availableTrainees(id, params) {
    return api.get(`/batches/batches/${id}/available_trainees/`, { params });
  },

  dropEnrollment(id) {
    return api.post(`/batches/enrollments/${id}/drop/`);
  },

  transferEnrollment(id, data) {
    return api.post(`/batches/enrollments/${id}/transfer/`, data);
  },
};

export default batchService;
