import api from './axiosInstance';

export const getApprovedBusinesses = () => api.get('/api/business/approved');
export const getMyBusinesses = () => api.get('/api/business/my');
export const createBusiness = (data) => api.post('/api/business', data);
export const getBusinessById = (id) => api.get(`/api/business/${id}`);

// Admin
export const getAllBusinesses = () => api.get('/api/business/all');
export const getPendingBusinesses = () => api.get('/api/business/pending');

// Use the correct approve/reject endpoints as specified by backend
export const approveBusiness = (id) => api.put(`/api/business/${id}/approve`);
export const rejectBusiness = (id) => api.put(`/api/business/${id}/reject`);
