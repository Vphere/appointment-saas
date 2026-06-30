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

export const getPopularServices = (limit = 6) =>
  api.get('/api/services/popular', { params: { limit } });

export const getNearbyServices = (lat, lng, radiusKm = 20) =>
  api.get('/api/services/nearby', { params: { lat, lng, radiusKm } });

export function formatServiceLocation(service) {
  const parts = [];

  if (service.address) parts.push(service.address);
  if (service.city) parts.push(service.city);
  if (service.state && !service.city) parts.push(service.state);

  return parts.join(', ');
}

export function serviceDropdownLabel(service) {
  const location = formatServiceLocation(service);

  return location
    ? `${service.name} — ${location}`
    : service.name;
}