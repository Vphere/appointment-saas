import api from './axiosInstance';

export const getLocations     = (businessId)           => api.get(`/api/locations/business/${businessId}`);
export const addLocation      = (businessId, data)     => api.post(`/api/locations/business/${businessId}`, data);
export const addLocationsBulk = (businessId, dataArr)  => api.post(`/api/locations/business/${businessId}/bulk`, dataArr);
export const deleteLocation   = (locationId)           => api.delete(`/api/locations/${locationId}`);