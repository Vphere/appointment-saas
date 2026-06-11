import api from './axiosInstance';

export const getPaymentAccounts  = (businessId) =>
    api.get(`/api/payment-accounts/business/${businessId}`);

export const addPaymentAccount   = (data) =>
    api.post('/api/payment-accounts', data);

export const setDefaultAccount   = (id) =>
    api.patch(`/api/payment-accounts/${id}/set-default`);

export const deletePaymentAccount = (id) =>
    api.delete(`/api/payment-accounts/${id}`);