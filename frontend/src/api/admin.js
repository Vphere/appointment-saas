import api from './axiosInstance';

// ── Dashboard ──────────────────────────────────────────────────
export const getAdminStats = () => api.get('/api/admin/stats');

// ── User Management ────────────────────────────────────────────
export const getAllUsers        = ()           => api.get('/api/admin/users');
export const updateUserRole     = (id, role)   => api.put(`/api/admin/users/${id}/role`, { role });
// Soft-delete (deactivate). Cancels the user's pending/confirmed appointments
// and emails the user + affected business owners. `reason` is optional.
export const deleteUser         = (id, reason) =>
  api.delete(`/api/admin/users/${id}`, { data: reason ? { reason } : {} });
export const restoreUser        = (id)         => api.put(`/api/admin/users/${id}/restore`);

// ── Review Moderation ──────────────────────────────────────────
export const getAllReviewsAdmin  = ()           => api.get('/api/admin/reviews');
export const removeReviewAdmin   = (id, data)   => api.put(`/api/admin/reviews/${id}/remove`, data);
export const restoreReviewAdmin  = (id)         => api.put(`/api/admin/reviews/${id}/restore`);