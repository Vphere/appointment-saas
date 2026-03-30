import api from './axiosInstance';

export const getMyAppointments = () => api.get('/api/appointments/my');
export const getBusinessAppointments = () => api.get('/api/appointments/my-business');
export const bookAppointment = (data) => api.post('/api/appointments', data);
export const cancelAppointment = (id) => api.patch(`/api/appointments/${id}/cancel`);
export const confirmAppointment = (id) => api.patch(`/api/appointments/${id}/confirm`);
export const rejectAppointment = (id) => api.patch(`/api/appointments/${id}/reject`);
export const completeAppointment = (id) => api.patch(`/api/appointments/${id}/complete`);
