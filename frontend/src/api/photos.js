import api from './axiosInstance';

export const getPhotos = (serviceId) =>
  api.get(`/api/photos/service/${serviceId}`);

export const uploadPhoto = (serviceId, file, caption = '') => {
  const fd = new FormData();
  fd.append('file', file);
  if (caption) fd.append('caption', caption);
  return api.post(`/api/photos/service/${serviceId}`, fd, {  
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deletePhoto = (photoId) =>
  api.delete(`/api/photos/${photoId}`);