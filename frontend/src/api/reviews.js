import api from './axiosInstance';

export const submitReview = (data) => api.post('/api/reviews', data);
export const getBusinessReviews = (businessId) => api.get(`/api/reviews/business/${businessId}`);
export const getAverageRating = (businessId) => api.get(`/api/reviews/avg/${businessId}`);
export const updateReview = (id, data) => api.put(`/api/reviews/${id}`, data);
export const getServiceAverageRating = (serviceId) => api.get(`/api/reviews/avg/service/${serviceId}`);