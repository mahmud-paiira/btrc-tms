import api from './api';

const dashboardService = {
  async getStats() {
    const [batchRes, appRes] = await Promise.allSettled([
      api.get('/batches/batches/', { params: { page_size: 1 } }),
      api.get('/center/applications/stats/'),
    ]);

    const batchCount = batchRes.value?.data?.count || 0;
    const appStats = appRes.value?.data || {};

    return {
      total_batches: batchCount,
      ...appStats,
    };
  },

  async getRecentBatches(params = {}) {
    const { data } = await api.get('/batches/batches/', {
      params: { page_size: 10, ...params },
    });
    return data;
  },

  async getRunningBatchCount() {
    const { data } = await api.get('/batches/batches/', {
      params: { status: 'running', page_size: 1 },
    });
    return data.count || 0;
  },

  async getCompletedBatchCount() {
    const { data } = await api.get('/batches/batches/', {
      params: { status: 'completed', page_size: 1 },
    });
    return data.count || 0;
  },

  async getCertificatesList(params = {}) {
    const { data } = await api.get('/center/certificates/list/', { params });
    return data;
  },

  async getAssessmentResults(batchId) {
    const { data } = await api.get(`/center/assessment/batch/${batchId}/results/`);
    return data;
  },
};

export default dashboardService;
