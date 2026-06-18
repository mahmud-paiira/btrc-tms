import api from './api';

const allowanceService = {
  listCategories(params) {
    return api.get('/allowance/categories/', { params });
  },
  getCategory(id) {
    return api.get(`/allowance/categories/${id}/`);
  },
  createCategory(data) {
    return api.post('/allowance/categories/', data);
  },
  updateCategory(id, data) {
    return api.put(`/allowance/categories/${id}/`, data);
  },
  deleteCategory(id) {
    return api.delete(`/allowance/categories/${id}/`);
  },
  listAllowances(params) {
    return api.get('/allowance/allowances/', { params });
  },
  generateAllowances(data) {
    return api.post('/allowance/allowances/generate/', data);
  },
  calculateBatch(data) {
    return api.post('/allowance/allowances/calculate_batch/', data);
  },
  approveAllowance(id, data) {
    return api.post(`/allowance/allowances/${id}/approve/`, data);
  },
  disburseAllowance(id) {
    return api.post(`/allowance/allowances/${id}/disburse/`);
  },
};

export default allowanceService;
