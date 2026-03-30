import api from './axiosInstance';

// Backend SlotController signature:
// GET /api/slots?businessId=&date=&duration=
// duration is the service duration in minutes (integer)

export const getAvailableSlots = (serviceId, date, duration) => {
  return api.get('/api/slots', {
    params: {
      serviceId,   // ✅ correct
      date,
      duration
    }
  });
};