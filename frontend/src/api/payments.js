import api from './axiosInstance';
import axios from 'axios';

export const createPaymentOrder  = (appointmentId) =>
    api.post('/api/payments/create-order', { appointmentId });

export const verifyPayment = (data) =>
    api.post('/api/payments/verify', data);

export const initiateCompletion = (appointmentId) =>
    api.post(`/api/payments/initiate-completion/${appointmentId}`);

export const confirmByOtp = (appointmentId, otp) =>
    api.post('/api/payments/confirm-otp', { appointmentId, otp });

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const getConsentDetails = (token) =>
    axios.get(`${BASE}/api/payments/consent/${token}`);

export const confirmByLink = (token) =>
    axios.post(`${BASE}/api/payments/consent/${token}/confirm`);

export const disputeByLink = (token, reason) =>
    axios.post(`${BASE}/api/payments/consent/${token}/dispute`, { reason });