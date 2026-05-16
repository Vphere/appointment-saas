import api from './axiosInstance';

// ── Dashboard ──────────────────────────────────────────────────
export const getAdminStats = () => api.get('/api/admin/stats');

// ── User Management ────────────────────────────────────────────
export const getAllUsers        = ()           => api.get('/api/admin/users');
export const updateUserRole     = (id, role)   => api.put(`/api/admin/users/${id}/role`, { role });
export const deleteUser         = (id)         => api.delete(`/api/admin/users/${id}`);

// ── Review Moderation ──────────────────────────────────────────
export const getAllReviewsAdmin  = ()           => api.get('/api/admin/reviews');
export const removeReviewAdmin   = (id, data)   => api.put(`/api/admin/reviews/${id}/remove`, data);
export const restoreReviewAdmin  = (id)         => api.put(`/api/admin/reviews/${id}/restore`);