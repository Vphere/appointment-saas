import api from './axiosInstance';

export const login = (data) => api.post('/api/auth/login', data);
export const register = (data) => api.post('/api/auth/register', data);

export const forgotPassword = (email) =>
  api.post(
    `/api/auth/forgot-password?email=${email}`
  );

export const verifyOtp = (email, otp) =>
  api.post(
    `/api/auth/verify-otp?email=${email}&otp=${otp}`
  );

export const resetPassword = (email, newPassword) =>
  api.post(
    `/api/auth/reset-password?email=${email}&newPassword=${newPassword}`
  );