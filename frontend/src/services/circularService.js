import api from './api';

const circularService = {
  getByCenterCode(code) {
    return api.get(`/circulars/public/by-center/${code}/`);
  },

  getByUrl(slug) {
    return api.get(`/circulars/public/by-url/${slug}/`);
  },

  getAllPublished() {
    return api.get('/circulars/public/');
  },
};

export default circularService;
