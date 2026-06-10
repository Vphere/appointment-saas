import api from './axiosInstance';

export const getAvailableSlots = (serviceId, date, duration) => {
  return api.get('/api/slots', {
    params: {
      serviceId,   
      date,
      duration
    }
  });
};