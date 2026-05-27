import { useEffect, useState } from 'react';
import { getMyAppointments, cancelAppointment } from '../api/appointments';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import ReviewModal from '../components/ReviewModal';
import Spinner from '../components/Spinner';
import ReviewRemovedNotice from '../components/ReviewRemovedNotice';
import './MyAppointments.css';

// ── Cancel Confirmation Modal ──────────────────────────────────────────────
function CancelModal({ appointment, onConfirm, onClose, loading }) {
  return (
    <div className="ma-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ma-modal">
        <div className="ma-modal-icon">🗑️</div>
        <h3 className="ma-modal-title">Cancel Appointment?</h3>
        <p className="ma-modal-body">
          You're about to cancel{' '}
          <strong>{appointment.serviceName}</strong> at{' '}
          <strong>{appointment.businessName}</strong> on{' '}
          <strong>
            {new Date(appointment.appointmentDate).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </strong>{' '}
          at <strong>{appointment.appointmentTime?.slice(0, 5)}</strong>.
          This action cannot be undone.
        </p>
        <div className="ma-modal-actions">
          <button className="ma-btn ma-btn--ghost" onClick={onClose} disabled={loading}>
            Keep It
          </button>
          <button className="ma-btn ma-btn--danger-solid" onClick={onConfirm} disabled={loading}>
            {loading ? 'Cancelling…' : '✕ Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [reviewTarget, setReviewTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);   // ← replaces window.confirm
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
        const appts = [...r.data].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setAppointments(appts);

        const reviewMap = {};
        await Promise.all(
          appts
            .filter((a) => a.status === 'COMPLETED' && a.reviewed)
            .map(async (a) => {
              try {
                const res = await api.get(`/api/reviews/appointment/${a.id}`);
                if (res.data) reviewMap[a.id] = res.data;
              } catch { /* no review */ }
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
    } catch { setSlots([]); }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setActionLoading(cancelTarget.id);
    try {
      await cancelAppointment(cancelTarget.id);
      setCancelTarget(null);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '—';
    return new Date(dtStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isUpcoming = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) >= new Date(new Date().toDateString());
  };

  const FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const filtered = filter === 'ALL'
    ? appointments
    : appointments.filter((a) => a.status === filter);

  const statusCounts = FILTERS.slice(1).reduce((acc, f) => {
    acc[f] = appointments.filter((a) => a.status === f).length;
    return acc;
  }, {});

  if (loading) return (
    <div className="ma-page">
      <Spinner message="Loading your appointments..." />
    </div>
  );

  return (
    <div className="ma-page">

      {/* ── Hero Banner (matches AllServices / Businesses hero style) ── */}
      <div className="ma-hero">
        <div className="ma-hero-inner">
          <div className="ma-hero-label">📋 MY BOOKINGS</div>
          <h1 className="ma-hero-title">My Appointments</h1>
          <p className="ma-hero-sub">
            Your complete booking history — track, manage, and review your past and upcoming sessions.
          </p>
        </div>
        <div className="ma-stats">
          <div className="ma-stat-chip">
            <span className="ma-stat-num">{appointments.length}</span>
            <span className="ma-stat-label">Total</span>
          </div>
          <div className="ma-stat-chip ma-stat-chip--active">
            <span className="ma-stat-num">
              {(statusCounts['PENDING'] || 0) + (statusCounts['CONFIRMED'] || 0)}
            </span>
            <span className="ma-stat-label">Active</span>
          </div>
          <div className="ma-stat-chip ma-stat-chip--done">
            <span className="ma-stat-num">{statusCounts['COMPLETED'] || 0}</span>
            <span className="ma-stat-label">Done</span>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="ma-filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f}
            data-filter={f}
            className={`ma-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            <span>{f}</span>
            {f !== 'ALL' && statusCounts[f] > 0 && (
              <span className="ma-filter-count">{statusCounts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Appointment List ── */}
      {filtered.length === 0 ? (
        <div className="ma-empty">
          <div className="ma-empty-icon">📅</div>
          <h3>No appointments found</h3>
          <p>
            {filter === 'ALL'
              ? 'Book your first appointment to get started'
              : `No ${filter.toLowerCase()} appointments yet`}
          </p>
        </div>
      ) : (
        <div className="ma-list">
          {filtered.map((appt) => {
            const review = existingReviews[appt.id];
            const isRemoved = review?.removedByAdmin === true;
            const upcoming = isUpcoming(appt.appointmentDate);

            return (
              <div key={appt.id} className={`ma-card ma-card--${appt.status.toLowerCase()}`}>

                {/* Top bar */}
                <div className="ma-card-topbar">
                  <div className="ma-card-identity">
                    <div className="ma-service-name">{appt.serviceName || `Service #${appt.serviceId}`}</div>
                    <div className="ma-business-row">
                      <span className="ma-business-icon">🏢</span>
                      <span className="ma-business-label">Business</span>
                      <span className="ma-business-name">{appt.businessName || `Business #${appt.businessId}`}</span>
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>

                <div className="ma-card-divider" />

                {/* Details */}
                <div className="ma-card-details">
                  <div className="ma-detail-row">
                    <div className="ma-detail-item">
                      <span className="ma-detail-icon">📅</span>
                      <span className="ma-detail-label">{upcoming ? 'Appointment On' : 'Appointment Date'}</span>
                      <span className="ma-detail-value">{formatDate(appt.appointmentDate)}</span>
                    </div>
                    <div className="ma-detail-item">
                      <span className="ma-detail-icon">🕐</span>
                      <span className="ma-detail-label">Time</span>
                      <span className="ma-detail-value">{appt.appointmentTime?.slice(0, 5) || '—'}</span>
                    </div>
                  </div>

                  {appt.price && (
                    <div className="ma-detail-row">
                      <div className="ma-detail-item">
                        <span className="ma-detail-icon">💰</span>
                        <span className="ma-detail-label">Appointment Total</span>
                        <span className="ma-detail-value ma-price">₹{appt.price}</span>
                      </div>
                      {appt.duration && (
                        <div className="ma-detail-item">
                          <span className="ma-detail-icon">⏱️</span>
                          <span className="ma-detail-label">Duration</span>
                          <span className="ma-detail-value">{appt.duration} min</span>
                        </div>
                      )}
                    </div>
                  )}

                  {appt.createdAt && (
                    <div className="ma-detail-row">
                      <div className="ma-detail-item ma-detail-item--muted">
                        <span className="ma-detail-icon">🗓️</span>
                        <span className="ma-detail-label">Booked On</span>
                        <span className="ma-detail-value">{formatDateTime(appt.createdAt)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Reschedule panel ── */}
                {editingId === appt.id ? (
                  <div className="ma-edit-panel">
                    <div className="ma-edit-label">📆 Reschedule Appointment</div>
                    <input
                      type="date"
                      className="ma-date-input"
                      min={new Date().toISOString().split('T')[0]}
                      defaultValue={appt.appointmentDate}
                      id={`date-${appt.id}`}
                      onChange={(e) => fetchSlots(appt, e.target.value)}
                    />
                    {slots.length > 0 && (
                      <div className="ma-slots-grid">
                        {slots.map((s) => (
                          <button
                            key={s.time}
                            className={`ma-slot-btn ${selectedTime === s.time ? 'selected' : ''}`}
                            onClick={() => setSelectedTime(s.time)}
                          >
                            {s.time.slice(0, 5)}
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedTime && (
                      <p className="ma-selected-time">Selected: {selectedTime.slice(0, 5)}</p>
                    )}
                    <div className="ma-edit-actions">
                      <button
                        className="ma-btn ma-btn--save"
                        onClick={() => {
                          const newDate = document.getElementById(`date-${appt.id}`).value;
                          if (!selectedTime) { alert('Please select a time slot'); return; }
                          if (!newDate) { alert('Please select a date'); return; }
                          handleSaveEdit(appt, newDate, selectedTime);
                        }}
                        disabled={actionLoading === appt.id}
                      >
                        {actionLoading === appt.id ? 'Saving…' : '💾 Save Changes'}
                      </button>
                      <button className="ma-btn ma-btn--ghost" onClick={() => setEditingId(null)}>
                        Discard
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ma-card-actions">

                    {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                      <>
                        <button
                          className="ma-btn ma-btn--ghost"
                          onClick={() => handleEdit(appt)}
                          disabled={actionLoading === appt.id}
                        >
                          ✏️ Reschedule
                        </button>
                        <button
                          className="ma-btn ma-btn--danger"
                          onClick={() => setCancelTarget(appt)}   // ← opens modal, not alert
                          disabled={actionLoading === appt.id}
                        >
                          ✕ Cancel
                        </button>
                      </>
                    )}

                    {appt.status === 'COMPLETED' && !appt.reviewed && (
                      <button
                        className="ma-btn ma-btn--review"
                        onClick={() => setReviewTarget({ appt, existingReview: null })}
                      >
                        ⭐ Leave a Review
                      </button>
                    )}

                    {appt.status === 'COMPLETED' && appt.reviewed && (
                      <div className="ma-review-section">
                        {isRemoved && review && (
                          <ReviewRemovedNotice
                            removalReason={review.removalReason}
                            removedAt={review.removedAt}
                          />
                        )}

                        {!isRemoved && review && (
                          <div className="ma-review-card">
                            <div className="ma-review-stars">
                              {[1,2,3,4,5].map((s) => (
                                <span key={s} className={`ma-star ${s <= review.rating ? 'filled' : 'empty'}`}>★</span>
                              ))}
                              <span className="ma-review-score">{review.rating}/5</span>
                            </div>
                            {review.comment && (
                              <div className="ma-review-comment">
                                <span className="ma-review-quote-mark">"</span>
                                {review.comment}
                                <span className="ma-review-quote-mark">"</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="ma-review-actions">
                          <span className="ma-reviewed-badge">✓ Reviewed</span>
                          {!isRemoved && review && (
                            <button
                              className="ma-btn ma-btn--ghost ma-btn--sm"
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

      {/* ── Cancel Confirmation Modal ── */}
      {cancelTarget && (
        <CancelModal
          appointment={cancelTarget}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelTarget(null)}
          loading={actionLoading === cancelTarget.id}
        />
      )}

      {/* ── Review Modal ── */}
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