import { useEffect, useState } from 'react';
import {
  getBusinessAppointments,
  confirmAppointment,
  rejectAppointment,
  markRemainingPaid
} from '../api/appointments';
import { initiateCompletion, confirmByOtp } from '../api/payments';
import Spinner from '../components/Spinner';
import './OwnerAppointments.css';

const FILTERS = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'AWAITING_REMAINING_PAYMENT',
  'COMPLETED',
  'CANCELLED',
];

const FILTER_LABELS = {
  ALL:                        'All',
  PENDING:                    'Pending',
  CONFIRMED:                  'Confirmed',
  AWAITING_REMAINING_PAYMENT: 'Awaiting Payment',
  COMPLETED:                  'Completed',
  CANCELLED:                  'Cancelled',
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
};

const formatTime = (t) => {
  if (!t) return '—';
  try {
    const [h, m] = String(t).slice(0, 5).split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12  = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch { return t; }
};

const formatDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

function ApptStatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  const label = s
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
  return (
    <span className={`oa-status-badge oa-status-${s.toLowerCase()}`}>
      <span className="oa-status-dot" />
      Status: {label}
    </span>
  );
}

function DetailChip({ icon, label, value, accent }) {
  return (
    <div className={`oa-chip ${accent ? `oa-chip--${accent}` : ''}`}>
      <span className="oa-chip-icon">{icon}</span>
      <div className="oa-chip-body">
        <span className="oa-chip-label">{label}</span>
        <span className="oa-chip-value">{value}</span>
      </div>
    </div>
  );
}

// OTP input row — self-contained local state, clears error on type
function OtpInputRow({ appt, onAction, actionLoading, otpError, onOtpChange }) {
  const [otp, setOtp] = useState('');

  const handleChange = (val) => {
    setOtp(val);
    if (onOtpChange) onOtpChange();
  };

  return (
    <div className="oa-otp-input-row">
      <input
        type="text"
        maxLength={6}
        placeholder="Enter 6-digit OTP"
        value={otp}
        onChange={e => handleChange(e.target.value.replace(/\D/g, ''))}
        className={`oa-otp-input ${otpError ? 'oa-otp-input--error' : ''}`}
      />
      <button
        className="btn btn-success btn-sm"
        disabled={otp.length !== 6 || !!actionLoading}
        onClick={() => onAction(appt.id, 'confirm-otp', otp)}
      >
        {actionLoading === `${appt.id}-confirm-otp` ? '⏳' : '✓ Verify'}
      </button>
    </div>
  );
}

// ── Inline Toast Notification ──────────────────────────────────────
// Shows a temporary success/info message that auto-dismisses
function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#34d399' },
    info:    { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)', color: '#a78bfa' },
    error:   { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  color: '#fca5a5' },
  };
  const c = colors[type] || colors.info;

  return (
    <div className="oa-toast" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <span>{message}</span>
      <button className="oa-toast-close" onClick={onClose}>✕</button>
    </div>
  );
}

// ── AppointmentCard ─────────────────────────────────────────────────
function AppointmentCard({ appt, onAction, actionLoading, cardError, otpError, onClearCardError, isJustUpdated, otpOpen, onOpenOtp}) {
  const customerName = appt.userName || appt.userEmail ||
    (appt.userId ? `User #${appt.userId}` : 'Unknown Customer');

  const requestedValue = formatDateTime(appt.createdAt);
  const statusKey = (appt.status || '').toLowerCase();

  return (
    <div className={`oa-card oa-card--${statusKey} card ${isJustUpdated ? 'oa-card--highlight' : ''} ${otpOpen ? 'oa-otp-pinned' : ''}`}>

      {/* Row 1: customer + status */}
      <div className="oa-card-header">
        <div className="oa-customer">
          <div className="oa-customer-avatar">
            {customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="oa-customer-name">{customerName}</div>
            <div className="oa-customer-label">Customer</div>
          </div>
        </div>
        <ApptStatusBadge status={appt.status} />
      </div>

      <div className="oa-card-divider" />

      {/* Row 2: date · time · price */}
      <div className="oa-chips-row">
        <DetailChip icon="📅" label="Appointment Date" value={formatDate(appt.appointmentDate)} />
        <DetailChip icon="🕐" label="Time"             value={formatTime(appt.appointmentTime)} />
        <DetailChip icon="💰" label="Price"            value={appt.price ? `₹${appt.price}` : '—'} accent="price" />
      </div>

      {/* Row 3: requested on · service · business */}
      <div className="oa-chips-row">
        <DetailChip icon="📥" label="Requested On" value={requestedValue} />
        <DetailChip icon="⚙️" label="Service"  value={appt.serviceName  || '—'} />
        <DetailChip icon="🏢" label="Business" value={appt.businessName || '—'} />
      </div>

      {/* General error banner (non-OTP errors) */}
      {cardError && !otpError && (
        <div className="oa-card-error">
          <span className="oa-card-error-icon">⚠️</span>
          <span className="oa-card-error-msg">{cardError}</span>
          <button className="oa-card-error-close" onClick={onClearCardError}>✕</button>
        </div>
      )}

      {(appt.status === 'PENDING' ||
        appt.status === 'CONFIRMED' ||
        appt.status === 'AWAITING_REMAINING_PAYMENT') && (

          <div className="oa-actions">

            {/* ── PENDING ─────────────────────────────────────── */}
            {appt.status === 'PENDING' && (
              <>
                {appt.paymentStatus === 'PENDING_PAYMENT' && (
                  <div className="oa-deposit-warning">
                    <span>⚠️</span>
                    <span>
                      <strong>Deposit not paid.</strong> The customer has not completed the 30%
                      deposit payment. You cannot confirm this appointment until they do.
                      You may still reject it.
                    </span>
                  </div>
                )}
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => onAction(appt.id, 'confirm')}
                  disabled={!!actionLoading || appt.paymentStatus === 'PENDING_PAYMENT'}
                  title={appt.paymentStatus === 'PENDING_PAYMENT' ? 'Cannot confirm — deposit not paid' : ''}
                >
                  {actionLoading === `${appt.id}-confirm` ? '⏳ Confirming…' : '✓ Confirm'}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => onAction(appt.id, 'reject')}
                  disabled={!!actionLoading}
                >
                  {actionLoading === `${appt.id}-reject` ? '⏳ Rejecting…' : '✕ Reject'}
                </button>
              </>
            )}

            {/* ── CONFIRMED — send OTP ─────────────────────── */}
            {appt.status === 'CONFIRMED' && appt.paymentStatus !== 'AWAITING_CONSENT' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onAction(appt.id, 'initiate-completion')}
                disabled={!!actionLoading}
              >
                {actionLoading === `${appt.id}-initiate-completion`
                  ? '⏳ Sending OTP…'
                  : '📤 Mark as Rendered (Send OTP)'}
              </button>
            )}

            {appt.status === 'CONFIRMED' &&
              appt.paymentStatus === 'AWAITING_CONSENT' && (
                otpOpen ? (
                  <div className="oa-otp-section">
                    <div className="oa-otp-notice">
                      📧 OTP sent to customer's email. Ask them to share it with you.
                    </div>

                    <OtpInputRow
                      appt={appt}
                      onAction={onAction}
                      actionLoading={actionLoading}
                      otpError={otpError}
                      onOtpChange={onClearCardError}
                    />

                    {otpError && (
                      <div className="oa-otp-error-inline">
                        ❌ {cardError}
                      </div>
                    )}

                    <button
                      className="btn btn-secondary btn-sm oa-resend-btn"
                      onClick={() => onAction(appt.id, 'initiate-completion')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === `${appt.id}-initiate-completion`
                        ? '⏳ Resending…'
                        : '🔄 Resend OTP'}
                    </button>
                  </div>

                ) : (
                  <div className="oa-remaining-section">

                    <div className="oa-remaining-notice">
                      📧 OTP has already been sent to the customer.
                      Ask them for the OTP when they're ready.
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={onOpenOtp}
                      >
                        🔐 Enter OTP
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onAction(appt.id, 'initiate-completion')}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === `${appt.id}-initiate-completion`
                          ? '⏳ Resending…'
                          : '🔄 Resend OTP'}
                      </button>
                    </div>
                  </div>
                )
              )}

            {/* ── AWAITING_REMAINING_PAYMENT ──────────────── */}
            {appt.status === 'AWAITING_REMAINING_PAYMENT' && (
              <div className="oa-remaining-section">
                <div className="oa-remaining-notice">
                  💵 Customer confirmed service. Collect remaining{' '}
                  <strong>
                    ₹{appt.price ? (appt.price * 0.70).toFixed(2) : '—'}
                  </strong>{' '}
                  via cash or UPI, then mark as paid.
                </div>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => onAction(appt.id, 'mark-remaining-paid')}
                  disabled={!!actionLoading}
                >
                  {actionLoading === `${appt.id}-mark-remaining-paid`
                    ? '⏳ Completing…'
                    : '✅ Remaining Payment Received'}
                </button>
              </div>
            )}

          </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function OwnerAppointments() {
  const [appointments, setAppointments]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError]                 = useState('');
  // Per-card inline errors: { [appointmentId]: { message, isOtpError } }
  const [cardErrors, setCardErrors]       = useState({});
  // ID of appointment just changed (for highlight pulse animation)
  const [justUpdatedId, setJustUpdatedId] = useState(null);
  // Toast notification
  const [toast, setToast]                 = useState(null);
  const [openOtpBoxes, setOpenOtpBoxes] = useState({});

  const fetchAppointments = () => {
    setLoading(true); setError('');
    getBusinessAppointments()
      .then(r => setAppointments(r.data || []))
      .catch(() => setError('Failed to load appointments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAppointments(); }, []);

  // Clear highlight pulse after animation
  useEffect(() => {
    if (!justUpdatedId) return;
    const t = setTimeout(() => setJustUpdatedId(null), 2200);
    return () => clearTimeout(t);
  }, [justUpdatedId]);

  const handleAction = async (id, action, otp = null) => {
    setActionLoading(`${id}-${action}`);
    setCardErrors(prev => ({ ...prev, [id]: null }));
    try {
      if (action === 'confirm')             await confirmAppointment(id);
      if (action === 'reject')              await rejectAppointment(id);
      if (action === 'initiate-completion') {
          await initiateCompletion(id);

          setOpenOtpBoxes(prev => ({
              ...prev,
              [id]: true,
          }));
      }
      if (action === 'confirm-otp') {
          await confirmByOtp(id, otp);

          setOpenOtpBoxes(prev => {
              const copy = { ...prev };
              delete copy[id];
              return copy;
          });
      }
      if (action === 'mark-remaining-paid') {
          await markRemainingPaid(id);

          // Remove any stale OTP state
          setOpenOtpBoxes(prev => {
              const updated = { ...prev };
              delete updated[id];
              return updated;
          });
      }

      // Refresh data, then switch filter + highlight the card
      await fetchAppointmentsAndThen(id, action);

    } catch (e) {
      const msg = e.response?.data?.message || `Failed to ${action.replace(/-/g, ' ')}`;
      const isOtpError = action === 'confirm-otp';
      setCardErrors(prev => ({ ...prev, [id]: { message: msg, isOtpError } }));
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch fresh data, then switch to the correct filter and highlight the card
  const fetchAppointmentsAndThen = async (updatedId, action) => {
    setLoading(false); // don't show full spinner for refreshes
    try {
      const r = await getBusinessAppointments();
      const fresh = r.data || [];
      setAppointments(fresh);

      // Determine which filter to switch to based on action
      let nextFilter = null;
      if (action === 'confirm-otp') {
        // OTP confirmed → appointment is now AWAITING_REMAINING_PAYMENT
        nextFilter = 'AWAITING_REMAINING_PAYMENT';
        setToast({ message: '✅ Service confirmed! Appointment moved to Awaiting Payment.', type: 'success' });
      } else if (action === 'mark-remaining-paid') {
        // Remaining payment marked → appointment is now COMPLETED
        nextFilter = 'COMPLETED';
        setToast({ message: '🎉 Payment received! Appointment completed.', type: 'success' });
      } else if (action === 'confirm') {
        nextFilter = 'CONFIRMED';
        setToast({ message: '✓ Appointment confirmed!', type: 'success' });
      } else if (action === 'initiate-completion') {
        setToast({ message: '📧 OTP sent to customer\'s email.', type: 'info' });
      } else if (action === 'reject') {
        nextFilter = 'CANCELLED';
      }

      if (nextFilter) setFilter(nextFilter);
      setJustUpdatedId(updatedId);
    } catch {
      setError('Failed to refresh appointments');
    }
  };

  const clearCardError = (id) => {
    setCardErrors(prev => ({ ...prev, [id]: null }));
  };

  // Sort: OTP-open cards first (so they stay pinned at top while working on them),
  // then just-updated card, then by createdAt descending.
  const sorted = [...appointments].sort((a, b) => {
    const aOtpOpen = !!openOtpBoxes[a.id];
    const bOtpOpen = !!openOtpBoxes[b.id];
    if (aOtpOpen && !bOtpOpen) return -1;
    if (!aOtpOpen && bOtpOpen) return 1;
    if (a.id === justUpdatedId) return -1;
    if (b.id === justUpdatedId) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filtered = filter === 'ALL'
    ? sorted
    : sorted.filter(a => a.status === filter);

  const counts = {
    total:                      appointments.length,
    PENDING:                    appointments.filter(a => a.status === 'PENDING').length,
    CONFIRMED:                  appointments.filter(a => a.status === 'CONFIRMED').length,
    AWAITING_REMAINING_PAYMENT: appointments.filter(a => a.status === 'AWAITING_REMAINING_PAYMENT').length,
    COMPLETED:                  appointments.filter(a => a.status === 'COMPLETED').length,
    CANCELLED:                  appointments.filter(a => a.status === 'CANCELLED').length,
  };

  if (loading) return <div className="page-container"><Spinner /></div>;

  return (
    <div className="page-container">

      {/* ── Toast notification ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Hero ── */}
      <div className="oa-hero">
        <div className="oa-hero-inner">
          <div className="oa-hero-label">📋 Appointments</div>
          <h1 className="oa-hero-title">Appointments Dashboard</h1>
          <p className="oa-hero-sub">Manage all bookings across your businesses</p>
        </div>

        {/* Stats chips */}
        <div className="oa-stats-row">
          <div className="oa-stat-card">
            <div className="oa-stat-value">{counts.total}</div>
            <div className="oa-stat-label">Total</div>
          </div>
          <div className="oa-stat-card oa-stat-card--pending">
            <div className="oa-stat-value">{counts.PENDING}</div>
            <div className="oa-stat-label">Pending</div>
          </div>
          <div className="oa-stat-card oa-stat-card--confirmed">
            <div className="oa-stat-value">{counts.CONFIRMED}</div>
            <div className="oa-stat-label">Confirmed</div>
          </div>
          <div className="oa-stat-card oa-stat-card--awaiting">
            <div className="oa-stat-value">{counts.AWAITING_REMAINING_PAYMENT}</div>
            <div className="oa-stat-label">Awaiting</div>
          </div>
          <div className="oa-stat-card oa-stat-card--completed">
            <div className="oa-stat-value">{counts.COMPLETED}</div>
            <div className="oa-stat-label">Completed</div>
          </div>
          <div className="oa-stat-card oa-stat-card--cancelled">
            <div className="oa-stat-value">{counts.CANCELLED}</div>
            <div className="oa-stat-label">Cancelled</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="oa-page-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="oa-filter-bar">
        {FILTERS.map(f => (
          <button
            key={f}
            data-filter={f}
            className={`oa-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            <span>{FILTER_LABELS[f] || f}</span>
            {f !== 'ALL' && counts[f] > 0 && (
              <span className="oa-filter-count">{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Card list ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No {filter !== 'ALL' ? FILTER_LABELS[filter]?.toLowerCase() : ''} appointments</h3>
          <p>{filter !== 'ALL' ? 'Change the filter to see others' : 'No bookings yet'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(appt => {
            const cardErrObj  = cardErrors[appt.id];
            const cardMessage = cardErrObj?.message || '';
            const isOtpError  = cardErrObj?.isOtpError || false;
            return (
              <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                  cardError={cardMessage}
                  otpError={isOtpError}
                  onClearCardError={() => clearCardError(appt.id)}
                  isJustUpdated={appt.id === justUpdatedId}
                  otpOpen={!!openOtpBoxes[appt.id]}
                  onOpenOtp={() =>
                      setOpenOtpBoxes(prev => ({
                          ...prev,
                          [appt.id]: true,
                      }))
                  }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
