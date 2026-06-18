import api from './api';

const assessorService = {
  myBatches(params) {
    return api.get('/assessors/my_batches/', { params });
  },
};

export default assessorService;
