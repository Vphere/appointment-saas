import { useEffect, useState } from 'react';
import { getMyAppointments, cancelAppointment } from '../api/appointments';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ReviewModal from '../components/ReviewModal';
import Spinner from '../components/Spinner';
import ReviewRemovedNotice from '../components/ReviewRemovedNotice';
import './MyAppointments.css';

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [existingReviews, setExistingReviews] = useState({});

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = () => {
    setLoading(true);
    getMyAppointments()
      .then(async (r) => {
        const appts = r.data;
        setAppointments(appts);

        // Fetch existing reviews for all completed+reviewed appointments
        const reviewMap = {};
        await Promise.all(
          appts
            .filter((a) => a.status === 'COMPLETED' && a.reviewed)
            .map(async (a) => {
              try {
                const res = await api.get(`/api/reviews/appointment/${a.id}`);
                if (res.data) reviewMap[a.id] = res.data;
              } catch {
                // no review found
              }
            })
        );
        setExistingReviews(reviewMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchSlots = async (appt, date) => {
    try {
      const res = await api.get('/api/slots', {
        params: { serviceId: appt.serviceId, date, duration: appt.duration },
      });
      setSlots(res.data);
    } catch {
      setSlots([]);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setActionLoading(id);
    try {
      await cancelAppointment(id);
      fetchAppointments();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (appt) => {
    if (editingId === appt.id) { setEditingId(null); return; }
    setEditingId(appt.id);
    setSelectedTime('');
    fetchSlots(appt, appt.appointmentDate);
  };

  const handleSaveEdit = async (appt, newDate, newTime) => {
    setActionLoading(appt.id);
    try {
      await api.put(`/api/appointments/${appt.id}/reschedule`, {
        businessId: appt.businessId,
        serviceId: appt.serviceId,
        appointmentDate: newDate,
        appointmentTime: newTime,
      });
      fetchAppointments();
      setEditingId(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const filtered = filter === 'ALL' ? appointments : appointments.filter((a) => a.status === filter);

  if (loading) return <div className="page-container"><Spinner message="Loading appointments..." /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Appointments</h1>
        <p className="page-subtitle">{appointments.length} total appointments</p>
      </div>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No appointments found</h3>
          <p>Book your first appointment to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((appt) => {
            const review = existingReviews[appt.id];
            const isRemoved = review?.removedByAdmin === true;

            return (
              <div key={appt.id} className="appointment-card">
                <div className="appointment-card-header">
                  <div>
                    <div className="appointment-business">
                      {appt.businessName || `Business #${appt.businessId}`}
                    </div>
                    <div className="appointment-service">
                      {appt.serviceName || `Service #${appt.serviceId}`}
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>

                <div className="appointment-meta">
                  <span>📅 {new Date(appt.appointmentDate).toLocaleDateString('en-IN')}</span>
                  <span>🕐 {appt.appointmentTime?.slice(0, 5)}</span>
                  {appt.price && <span>💰 ₹{appt.price}</span>}
                </div>

                {editingId === appt.id ? (
                  <div className="appointment-edit">
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      defaultValue={appt.appointmentDate}
                      id={`date-${appt.id}`}
                      onChange={(e) => fetchSlots(appt, e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {slots.map((s) => (
                        <button
                          key={s.time}
                          className={`btn btn-sm ${selectedTime === s.time ? 'btn-success' : 'btn-secondary'}`}
                          onClick={() => setSelectedTime(s.time)}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>
                    {selectedTime && (
                      <p style={{ marginTop: 6, fontSize: 14, color: '#9ca3af' }}>
                        Selected: {selectedTime.slice(0, 5)}
                      </p>
                    )}
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => {
                        const newDate = document.getElementById(`date-${appt.id}`).value;
                        if (!selectedTime) { alert('Please select a time slot'); return; }
                        if (!newDate)      { alert('Please select a date');       return; }
                        handleSaveEdit(appt, newDate, selectedTime);
                      }}
                      disabled={actionLoading === appt.id}
                    >
                      {actionLoading === appt.id ? 'Saving...' : '💾 Save'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="appointment-actions">
                    {/* Edit / Cancel for active appointments */}
                    {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEdit(appt)}
                        disabled={actionLoading === appt.id}
                      >
                        ✏️ Edit
                      </button>
                    )}
                    {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancel(appt.id)}
                        disabled={actionLoading === appt.id}
                      >
                        {actionLoading === appt.id ? 'Cancelling...' : '✕ Cancel'}
                      </button>
                    )}

                    {/* ── Completed: not yet reviewed ── */}
                    {appt.status === 'COMPLETED' && !appt.reviewed && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setReviewTarget({ appt, existingReview: null })}
                      >
                        ⭐ Give Review
                      </button>
                    )}

                    {/* ── Completed: reviewed ── */}
                    {appt.status === 'COMPLETED' && appt.reviewed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>

                        {/* CASE 1: Review was removed by admin */}
                        {isRemoved && review && (
                          <ReviewRemovedNotice
                            removalReason={review.removalReason}
                            removedAt={review.removedAt}
                          />
                        )}

                        {/* CASE 2: Active review — show content */}
                        {!isRemoved && review && (
                          <div style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            padding: '10px 14px',
                            fontSize: '0.85rem',
                          }}>
                            {/* Stars */}
                            <div style={{ color: '#f59e0b', marginBottom: 4, fontSize: '1rem' }}>
                              {'★'.repeat(review.rating)}
                              <span style={{ color: 'rgba(255,255,255,0.2)' }}>
                                {'★'.repeat(5 - review.rating)}
                              </span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 6 }}>
                                {review.rating}/5
                              </span>
                            </div>
                            {/* Comment */}
                            {review.comment && (
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontStyle: 'italic',
                                lineHeight: 1.5,
                              }}>
                                "{review.comment}"
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions row */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="badge badge-approved">Reviewed ✓</span>
                          {/* Only allow editing if review is NOT removed */}
                          {!isRemoved && review && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setReviewTarget({ appt, existingReview: review })}
                            >
                              ✏️ Edit Review
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal
          appointment={reviewTarget.appt}
          existingReview={reviewTarget.existingReview}
          onClose={() => setReviewTarget(null)}
          onSuccess={fetchAppointments}
        />
      )}
    </div>
  );
}