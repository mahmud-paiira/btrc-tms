import api from './api';

const applicationService = {
  list(params) {
    return api.get('/center/applications/', { params });
  },

  detail(id) {
    return api.get(`/center/applications/${id}/`);
  },

  review(id, data) {
    return api.post(`/center/applications/${id}/review/`, data);
  },

  bulkReview(data) {
    return api.post('/center/applications/bulk_review/', data);
  },

  getCirculars() {
    return api.get('/center/applications/circulars/');
  },

  getStats() {
    return api.get('/center/applications/stats/');
  },

  exportExcel(params) {
    return api.get('/center/applications/export_excel/', {
      params,
      responseType: 'blob',
    });
  },

  exportPdf(params) {
    return api.get('/center/applications/export_pdf/', {
      params,
      responseType: 'blob',
    });
  },
};

export default applicationService;
