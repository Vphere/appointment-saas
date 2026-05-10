import api from './axiosInstance';

export const getHolidays = (businessId) =>
  api.get(`/api/holidays/business/${businessId}`);

export const addHoliday = (data) =>
  api.post('/api/holidays', data);

export const deleteHoliday = (id) =>
  api.delete(`/api/holidays/${id}`);

export const getHolidaysByService = (serviceId) =>
  api.get(`/api/holidays/service/${serviceId}`);