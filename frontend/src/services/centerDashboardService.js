import api from './api';

const centerDashboardService = {
  getSummary() { return api.get('/center/dashboard/summary/'); },
  getCharts() { return api.get('/center/dashboard/charts/'); },
  getAlerts() { return api.get('/center/dashboard/alerts/'); },
  getQuickActions() { return api.get('/center/dashboard/quick_actions/'); },
  getRecentActivity() { return api.get('/center/dashboard/recent_activity/'); },
  getNotifications() { return api.get('/center/dashboard/notifications/'); },
};

export default centerDashboardService;
