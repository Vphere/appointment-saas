import api from './axiosInstance';

export const createPaymentOrder  = (appointmentId) =>
    api.post('/api/payments/create-order', { appointmentId });

export const verifyPayment = (data) =>
    api.post('/api/payments/verify', data);

export const initiateCompletion = (appointmentId) =>
    api.post(`/api/payments/initiate-completion/${appointmentId}`);

export const confirmByOtp = (appointmentId, otp) =>
    api.post('/api/payments/confirm-otp', { appointmentId, otp });

export const getConsentDetails = (token) =>
    api.get(`/api/payments/consent/${token}`);        // public, but api instance is fine

export const confirmByLink = (token) =>
    api.post(`/api/payments/consent/${token}/confirm`);

export const disputeByLink = (token, reason) =>
    api.post(`/api/payments/consent/${token}/dispute`, { reason });