import api from './axiosInstance';

export const getDocuments    = (businessId)                    => api.get(`/api/documents/business/${businessId}`);
export const deleteDocument  = (documentId)                    => api.delete(`/api/documents/${documentId}`);

export const uploadDocument  = (businessId, documentType, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  return api.post(`/api/documents/business/${businessId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};