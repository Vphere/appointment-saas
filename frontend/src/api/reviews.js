import api from './axiosInstance';

export const submitReview = (data) => api.post('/api/reviews', data);
export const getBusinessReviews = (businessId) => api.get(`/api/reviews/business/${businessId}`);
export const getAverageRating = (businessId) => api.get(`/api/reviews/avg/${businessId}`);
