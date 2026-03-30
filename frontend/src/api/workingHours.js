import api from './axiosInstance';

export const getWorkingHoursByService = (serviceId) =>
  api.get(`/api/working-hours/service/${serviceId}`);

export const saveWorkingHours = (data) => api.post('/api/working-hours', data);
export const updateWorkingHours = (id, data) => api.put(`/api/working-hours/${id}`, data);
export const bulkSaveWorkingHours = (data) => api.post('/api/working-hours/bulk', data);
