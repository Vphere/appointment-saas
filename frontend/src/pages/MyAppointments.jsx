import { useEffect, useState } from 'react';
import { getMyAppointments, cancelAppointment } from '../api/appointments';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import ReviewModal from '../components/ReviewModal';
import Spinner from '../components/Spinner';
import ReviewRemovedNotice from '../components/ReviewRemovedNotice';
import { formatDateDisplay, formatFullDateTime, isUpcomingDate } from '../utils/dateUtils';
import './MyAppointments.css';
import { useNavigate } from 'react-router-dom';

// ── Cancel Modal ───────────────────────────────────────────────────
function CancelModal({ appointment, onConfirm, onClose, loading }) {
  return (
    <div className="ma-modal-overlay"
         onClick={e => e.target === e.currentTarget && onClose()}>
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
          This cannot be undone.
        </p>
        <div className="ma-modal-actions">
          <button className="ma-btn ma-btn--ghost"
                  onClick={onClose} disabled={loading}>
            Keep It
          </button>
          <button className="ma-btn ma-btn--danger-solid"
                  onClick={onConfirm} disabled={loading}>
            {loading ? 'Cancelling…' : '✕ Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reschedule Panel ───────────────────────────────────────────────
function ReschedulePanel({ appt, onSave, onDiscard, actionLoading }) {
  const today = new Date().toISOString().split('T')[0];
  const [newDate, setNewDate]           = useState(appt.appointmentDate || today);
  const [slots, setSlots]               = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [slotsError, setSlotsError]     = useState('');

  useEffect(() => { fetchSlots(appt.appointmentDate || today); }, []);

  const fetchSlots = async (date) => {
    setSlotsLoading(true); setSlotsError(''); setSlots([]); setSelectedTime('');
    try {
      const res = await api.get('/api/slots', {
        params: { serviceId: appt.serviceId, date, duration: appt.duration || 30 },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setSlots(data);
      if (data.length === 0) setSlotsError('No slots available on this date.');
    } catch {
      setSlotsError('Could not load slots. Check working hours for this day.');
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const d = e.target.value;
    setNewDate(d);
    if (d) fetchSlots(d);
  };

  const handleSave = () => {
    if (!newDate)      return alert('Please select a date');
    if (!selectedTime) return alert('Please select a time slot');
    onSave(appt, newDate, selectedTime);
  };

  const getSlotTime = (slot) => {
    if (typeof slot === 'string') return slot;
    return slot?.time ? String(slot.time).slice(0, 5) : '';
  };

  const currentBooking = appt.appointmentTime?.slice(0, 5);

  return (
    <div className="ma-reschedule-panel">
      <div className="ma-reschedule-header">
        <span className="ma-reschedule-title">📆 Reschedule Appointment</span>
        <button className="ma-btn ma-btn--ghost ma-btn--sm" onClick={onDiscard}>
          ✕ Discard
        </button>
      </div>

      <div className="ma-reschedule-current">
        <span className="ma-reschedule-current-label">Currently booked:</span>
        <span className="ma-reschedule-current-val">
          {new Date(appt.appointmentDate).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })} at {currentBooking}
        </span>
      </div>

      <div className="ma-reschedule-date-row">
        <label className="ma-reschedule-field-label">New Date *</label>
        <input type="date" className="ma-date-input"
          min={today} value={newDate} onChange={handleDateChange} />
      </div>

      <div>
        <label className="ma-reschedule-field-label">
          Select New Time *
          {slotsLoading && <span className="ma-slots-loading"> · Loading slots…</span>}
        </label>

        {slotsError && !slotsLoading && (
          <div className="ma-slots-error">📭 {slotsError}</div>
        )}

        {!slotsLoading && slots.length > 0 && (
          <div className="ma-slots-grid">
            {slots.map((slot, i) => {
              const time      = getSlotTime(slot);
              const isCurrent = time === currentBooking && newDate === appt.appointmentDate;
              return (
                <button key={time || i} type="button"
                  className={`ma-slot-btn ${selectedTime === time ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                  onClick={() => setSelectedTime(time)}
                  title={isCurrent ? 'Current booking' : ''}>
                  {time}
                  {isCurrent && <span className="ma-slot-current-dot" />}
                </button>
              );
            })}
          </div>
        )}

        {selectedTime && (
          <div className="ma-selected-time-notice">
            ✓ New time selected: <strong>{selectedTime}</strong>
          </div>
        )}
      </div>

      <div className="ma-reschedule-actions">
        <button className="ma-btn ma-btn--save" onClick={handleSave}
          disabled={actionLoading || !selectedTime}>
          {actionLoading ? '⏳ Saving…' : '💾 Confirm Reschedule'}
        </button>
        <button className="ma-btn ma-btn--ghost" onClick={onDiscard}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function MyAppointments() {
  const [appointments, setAppointments]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('ALL');
  const [reviewTarget, setReviewTarget]   = useState(null);
  const [cancelTarget, setCancelTarget]   = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [editingId, setEditingId]         = useState(null);
  const [existingReviews, setExistingReviews] = useState({});
  const navigate = useNavigate();

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = () => {
    setLoading(true);
    getMyAppointments()
      .then(async r => {
        const appts = r.data;
        setAppointments(appts);
        const reviewMap = {};
        await Promise.all(
          appts
            .filter(a => a.status === 'COMPLETED' && a.reviewed)
            .map(async a => {
              try {
                const res = await api.get(`/api/reviews/appointment/${a.id}`);
                if (res.data) reviewMap[a.id] = res.data;
              } catch { /* no review yet */ }
            })
        );
        setExistingReviews(reviewMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    const targetId = cancelTarget.id;          
    setActionLoading(targetId);
    try {
      await cancelAppointment(targetId);
      await fetchAppointments();                
      setCancelTarget(null);                   
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveReschedule = async (appt, newDate, newTime) => {
    setActionLoading(appt.id);
    try {
      await api.put(`/api/appointments/${appt.id}/reschedule`, {
        businessId:      appt.businessId,
        serviceId:       appt.serviceId,
        appointmentDate: newDate,
        appointmentTime: newTime + ':00',
      });
      fetchAppointments();
      setEditingId(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to reschedule');
    } finally {
      setActionLoading(null);
    }
  };

  // Use utility functions from dateUtils for proper timezone handling
  // (formatDate is now formatDateDisplay from dateUtils)

  const formatBranch = appt => {
    const parts = [];
    if (appt.serviceAddress) parts.push(appt.serviceAddress);
    if (appt.serviceCity)    parts.push(appt.serviceCity);
    if (appt.serviceState && !appt.serviceCity) parts.push(appt.serviceState);
    return parts.join(', ') || null;
  };

  const FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'AWAITING_REMAINING_PAYMENT'];
 
  const FILTER_LABELS = {
    ALL:                       'All',
    PENDING:                   'Pending',
    CONFIRMED:                 'Confirmed',
    COMPLETED:                 'Completed',
    CANCELLED:                 'Cancelled',
    AWAITING_REMAINING_PAYMENT:'Awaiting Remaining Payment',
  };
  const filtered = filter === 'ALL'
    ? appointments
    : appointments.filter(a => a.status === filter);

  const statusCounts = FILTERS.slice(1).reduce((acc, f) => {
    acc[f] = appointments.filter(a => a.status === f).length;
    return acc;
  }, {});

  if (loading) return (
    <div className="ma-page"><Spinner message="Loading your appointments..." /></div>
  );

  return (
    <div className="ma-page">

      {/* Hero */}
      <div className="ma-hero">
        <div className="ma-hero-inner">
          <div className="ma-hero-label">📋 MY BOOKINGS</div>
          <h1 className="ma-hero-title">My Appointments</h1>
          <p className="ma-hero-sub">
            Your complete booking history — track, manage, and review your
            past and upcoming sessions.
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

      {/* Filter Bar */}
      <div className="ma-filter-bar">
        {FILTERS.map(f => (
          <button key={f} data-filter={f}
            className={`ma-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}>
            <span>{FILTER_LABELS[f] || f}</span>
            {f !== 'ALL' && statusCounts[f] > 0 && (
              <span className="ma-filter-count">{statusCounts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
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
          {filtered.map(appt => {
            const review    = existingReviews[appt.id];
            const isRemoved = review?.removedByAdmin === true;
            const upcoming  = isUpcomingDate(appt.appointmentDate);
            const branch    = formatBranch(appt);
            const hasUpdated = appt.updatedAt && appt.createdAt &&
              (new Date(appt.updatedAt) - new Date(appt.createdAt)) > 60_000;

            return (
              <div key={appt.id}
                   className={`ma-card ma-card--${appt.status.toLowerCase()}`}>

                {/* Top bar */}
                <div className="ma-card-topbar">
                  <div className="ma-card-identity">
                    <div className="ma-service-name">
                      {appt.serviceName || `Service #${appt.serviceId}`}
                    </div>
                    <div className="ma-business-row">
                      <span className="ma-business-icon">🏢</span>
                      <span className="ma-business-label">Business</span>
                      <span className="ma-business-name">
                        {appt.businessName || `Business #${appt.businessId}`}
                      </span>
                    </div>
                    {branch && (
                      <div className="ma-branch-row">
                        <span className="ma-branch-icon">📍</span>
                        <span className="ma-branch-label">Branch</span>
                        <span className="ma-branch-value">{branch}</span>
                      </div>
                    )}
                  </div>
                  <StatusBadge status={appt.status} />
                </div>

                <div className="ma-card-divider" />

                {/* Detail chips */}
                <div className="ma-card-details">
                  <div className="ma-detail-grid">
                    <div className="ma-detail-item">
                      <span className="ma-detail-icon">📅</span>
                      <div className="ma-detail-content">
                        <span className="ma-detail-label">
                          {upcoming ? 'Appointment On' : 'Appointment Date'}
                        </span>
                        <span className="ma-detail-value">
                          {formatDateDisplay(appt.appointmentDate)}
                        </span>
                      </div>
                    </div>

                    <div className="ma-detail-item">
                      <span className="ma-detail-icon">🕐</span>
                      <div className="ma-detail-content">
                        <span className="ma-detail-label">Time</span>
                        <span className="ma-detail-value">
                          {appt.appointmentTime?.slice(0, 5) || '—'}
                        </span>
                      </div>
                    </div>

                    {appt.price && (
                      <div className="ma-detail-item">
                        <span className="ma-detail-icon">💰</span>
                        <div className="ma-detail-content">
                          <span className="ma-detail-label">Total</span>
                          <span className="ma-detail-value ma-price">₹{appt.price}</span>
                        </div>
                      </div>
                    )}

                    {appt.duration && (
                      <div className="ma-detail-item">
                        <span className="ma-detail-icon">⏱️</span>
                        <div className="ma-detail-content">
                          <span className="ma-detail-label">Duration</span>
                          <span className="ma-detail-value">{appt.duration} min</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reschedule panel OR actions + review */}
                {editingId === appt.id ? (
                  <ReschedulePanel
                    appt={appt}
                    onSave={handleSaveReschedule}
                    onDiscard={() => setEditingId(null)}
                    actionLoading={actionLoading === appt.id}
                  />
                ) : (
                  <div className="ma-card-actions">
                     
                    {appt.paymentStatus === 'PENDING_PAYMENT' && appt.status === 'PENDING' && (
                      <div style={{
                        width: '100%',
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.30)',
                        borderRadius: 10,
                        padding: '14px 16px',
                        marginBottom: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 18 }}>⚠️</span>
                          <strong style={{ color: '#fbbf24', fontSize: 14 }}>Deposit Payment Incomplete</strong>
                        </div>
                        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>
                          Your slot is temporarily reserved but your{' '}
                          <strong style={{ color: '#e5e7eb' }}>30% deposit has not been paid</strong>.
                          The business owner cannot confirm this appointment until payment is received.
                          Complete payment now to secure your booking.
                        </p>
                        <button
                          className="ma-btn ma-btn--save"
                          style={{
                            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                            border: 'none',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 13,
                            padding: '9px 18px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                          onClick={() => navigate(`/book/${appt.businessId}`, {
                            state: {
                              // Flag that tells Booking.jsx to skip SELECT step
                              pendingAppointmentId: appt.id,
                    
                              // Pre-fill all booking details from the existing appointment card
                              business: {
                                id:   appt.businessId,
                                name: appt.businessName,
                                city: appt.serviceCity  || '',
                                state: appt.serviceState || '',
                              },
                    
                              // Pre-selected service so the service dropdown is auto-set
                              preSelectedServiceId: appt.serviceId,
                    
                              // Full appointment snapshot — Booking.jsx uses this to jump to REVIEW
                              pendingAppointment: {
                                id:              appt.id,
                                serviceId:       appt.serviceId,
                                serviceName:     appt.serviceName,
                                price:           appt.price,
                                duration:        appt.duration,
                                appointmentDate: appt.appointmentDate,   // "2026-06-25"
                                appointmentTime: appt.appointmentTime,   // "13:50:00"
                                businessId:      appt.businessId,
                                businessName:    appt.businessName,
                                serviceAddress:  appt.serviceAddress || '',
                                serviceCity:     appt.serviceCity    || '',
                                serviceState:    appt.serviceState   || '',
                              },
                            }
                          })}
                        >
                          💳 Complete Deposit Payment
                        </button>
                      </div>
                    )}
                  
                    {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') &&
                      appt.paymentStatus !== 'PENDING_PAYMENT' && (
                      <>
                        <button className="ma-btn ma-btn--ghost"
                          onClick={() => setEditingId(appt.id)}
                          disabled={actionLoading === appt.id}>
                          ✏️ Reschedule
                        </button>
                        <button className="ma-btn ma-btn--danger"
                          onClick={() => setCancelTarget(appt)}
                          disabled={actionLoading === appt.id}>
                          ✕ Cancel
                        </button>
                      </>
                    )}
                  
                    {appt.status === 'AWAITING_REMAINING_PAYMENT' && (
                      <div className="ma-remaining-notice">
                        ✅ Service confirmed! Please pay the remaining{' '}
                        <strong>
                          ₹{appt.price ? (appt.price * 0.70).toFixed(2) : '—'}
                        </strong>{' '}
                        directly to the service provider via cash or UPI.
                        Your appointment will be marked complete once payment is received.
                      </div>
                    )}
                  
                    {appt.status === 'COMPLETED' && !appt.reviewed && (
                      <button className="ma-btn ma-btn--review"
                        onClick={() => setReviewTarget({ appt, existingReview: null })}>
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
                              {[1,2,3,4,5].map(s => (
                                <span key={s}
                                  className={`ma-star ${s <= review.rating ? 'filled' : 'empty'}`}>
                                  ★
                                </span>
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
                            <button className="ma-btn ma-btn--ghost ma-btn--sm"
                              onClick={() => setReviewTarget({ appt, existingReview: review })}>
                              ✏️ Edit Review
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Meta footer — always last */}
                {appt.createdAt && (
                  <div className="ma-meta-row">
                    <span className="ma-meta-item">
                      🗓️ Booked on {formatFullDateTime(appt.createdAt?.split('T')[0], appt.createdAt?.split('T')[1]?.slice(0, 5))}
                    </span>
                    {hasUpdated && (
                      <span className="ma-meta-item ma-meta-item--updated">
                        ✏️ Updated on {formatFullDateTime(appt.updatedAt?.split('T')[0], appt.updatedAt?.split('T')[1]?.slice(0, 5))}
                      </span>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {cancelTarget && (
        <CancelModal
          appointment={cancelTarget}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelTarget(null)}
          loading={actionLoading === cancelTarget.id}
        />
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