import api from './axiosInstance';

export const getServicesByBusiness = (businessId) => api.get(`/api/services/business/${businessId}`);
export const getMyServices = (businessId) => api.get(`/api/services/business/${businessId}`);
export const getAllServices = () => api.get('/api/services');
export const getServicesByCategory = (category, city) =>
  api.get(`/api/services/by-category/${category}`, { params: city ? { city } : {} });
export const createService = (data) => api.post('/api/services', data);
export const createServicesBulk = (data) => api.post('/api/services/bulk', data);
export const updateService = (id, data) => api.put(`/api/services/${id}`, data);
export const deleteService = (id) => api.delete(`/api/services/${id}`);
