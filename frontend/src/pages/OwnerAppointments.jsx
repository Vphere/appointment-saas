import { useEffect, useState } from 'react';
import {
  getBusinessAppointments,
  confirmAppointment,
  rejectAppointment,
  markRemainingPaid
} from '../api/appointments';
import {initiateCompletion, confirmByOtp} from '../api/payments';
import Spinner from '../components/Spinner';
import './OwnerAppointments.css';

const FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

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

// ── Status badge — matches business card style ────────────────────
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

// ── Detail chip ───────────────────────────────────────────────────
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

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className="oa-stat-card">
      <div className="oa-stat-value" style={{ color }}>{value}</div>
      <div className="oa-stat-label">{label}</div>
    </div>
  );
}

function OtpInputRow({ appt, onAction, actionLoading }) {
    const [otp, setOtp] = useState('');
    return (
        <div className="oa-otp-input-row">
            <input
                type="text"
                maxLength={6}
                placeholder="Enter OTP"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="oa-otp-input"
            />
            <button className="btn btn-success btn-sm"
                disabled={otp.length !== 6 || !!actionLoading}
                onClick={() => onAction(appt.id, 'confirm-otp', otp)}>
                {actionLoading === `${appt.id}-confirm-otp` ? '⏳' : '✓ Verify'}
            </button>
        </div>
    );
}

// ── Appointment card ──────────────────────────────────────────────
function AppointmentCard({ appt, onAction, actionLoading }) {
  const customerName = appt.userName || appt.userEmail ||
    (appt.userId ? `User #${appt.userId}` : 'Unknown Customer');

  const requestedValue = formatDateTime(appt.createdAt);

  const statusKey = (appt.status || '').toLowerCase();

  return (
    <div className={`oa-card oa-card--${statusKey} card`}>

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

      {(appt.status === 'PENDING' ||
        appt.status === 'CONFIRMED' ||
        appt.status === 'AWAITING_REMAINING_PAYMENT') && (

          <div className="oa-actions">

              {appt.status === 'PENDING' && (
                <>
                  {/* If deposit not paid, show warning and disable Confirm */}
                  {appt.paymentStatus === 'PENDING_PAYMENT' && (
                    <div style={{
                      width: '100%',
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      marginBottom: 10,
                      fontSize: 13,
                      color: '#fde68a',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                    }}>
                      <span>⚠️</span>
                      <span>
                        <strong>Deposit not paid.</strong> The customer has not completed the 30% deposit
                        payment. You cannot confirm this appointment until they do.
                        You may still reject it.
                      </span>
                    </div>
                  )}
              
                  <button className="btn btn-success btn-sm"
                    onClick={() => onAction(appt.id, 'confirm')}
                    disabled={!!actionLoading || appt.paymentStatus === 'PENDING_PAYMENT'}
                    title={appt.paymentStatus === 'PENDING_PAYMENT' ? 'Cannot confirm — deposit not paid' : ''}
                  >
                    {actionLoading === `${appt.id}-confirm` ? '⏳ Confirming…' : '✓ Confirm'}
                  </button>
              
                  <button className="btn btn-danger btn-sm"
                    onClick={() => onAction(appt.id, 'reject')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === `${appt.id}-reject` ? '⏳ Rejecting…' : '✕ Reject'}
                  </button>
                </>
              )}

              {/* CONFIRMED — send OTP button */}
              {appt.status === 'CONFIRMED' &&
              appt.paymentStatus !== 'AWAITING_CONSENT' && (
                  <button className="btn btn-primary btn-sm"
                      onClick={() => onAction(appt.id, 'initiate-completion')}
                      disabled={!!actionLoading}>
                      {actionLoading === `${appt.id}-initiate-completion`
                          ? '⏳ Sending OTP…'
                          : '📤 Mark as Rendered (Send OTP)'}
                  </button>
              )}

              {/* CONFIRMED + AWAITING_CONSENT — OTP input */}
              {appt.status === 'CONFIRMED' &&
              appt.paymentStatus === 'AWAITING_CONSENT' && (
                  <div className="oa-otp-section">
                      <div className="oa-otp-notice">
                          📧 OTP sent to customer's email. Ask them to share it with you.
                      </div>
                      <OtpInputRow
                          appt={appt}
                          onAction={onAction}
                          actionLoading={actionLoading}
                      />
                      <button className="btn btn-secondary btn-sm oa-resend-btn"
                          onClick={() => onAction(appt.id, 'initiate-completion')}
                          disabled={!!actionLoading}>
                          {actionLoading === `${appt.id}-initiate-completion`
                              ? '⏳ Resending…' : '🔄 Resend OTP'}
                      </button>
                  </div>
              )}

              {/* AWAITING_REMAINING_PAYMENT — owner collects cash/UPI then clicks this */}
              {appt.status === 'AWAITING_REMAINING_PAYMENT' && (
                  <div className="oa-remaining-section">
                      <div className="oa-remaining-notice">
                          💵 Customer confirmed service. Collect remaining{' '}
                          <strong>
                              ₹{appt.price
                                  ? (appt.price * 0.70).toFixed(2)
                                  : '—'}
                          </strong>{' '}
                          via cash or UPI, then mark as paid.
                      </div>
                      <button className="btn btn-success btn-sm"
                          onClick={() => onAction(appt.id, 'mark-remaining-paid')}
                          disabled={!!actionLoading}>
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

  const fetchAppointments = () => {
    setLoading(true); setError('');
    getBusinessAppointments()
      .then(r => setAppointments(r.data || []))
      .catch(() => setError('Failed to load appointments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleAction = async (id, action, otp = null) => {
    setActionLoading(`${id}-${action}`);
    try {
        if (action === 'confirm')               await confirmAppointment(id);
        if (action === 'reject')                await rejectAppointment(id);
        if (action === 'initiate-completion')   await initiateCompletion(id);
        if (action === 'confirm-otp')           await confirmByOtp(id, otp);
        if (action === 'mark-remaining-paid')   await markRemainingPaid(id);
        fetchAppointments();
    } catch (e) {
        alert(e.response?.data?.message || `Failed to ${action}`);
    } finally {
        setActionLoading(null);
    }
  };

  const filtered = filter === 'ALL'
    ? appointments
    : appointments.filter(a => a.status === filter);

  const counts = {
    total:     appointments.length,
    pending:   appointments.filter(a => a.status === 'PENDING').length,
    confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
  };

  if (loading) return <div className="page-container"><Spinner /></div>;

  return (
    <div className="page-container">

      {/* ── Hero — matches MyAppointments ── */}
      <div className="oa-hero">
        <div className="oa-hero-inner">
          <div className="oa-hero-label">📋 Appointments</div>
          <h1 className="oa-hero-title">Appointments Dashboard</h1>
          <p className="oa-hero-sub">Manage all bookings across your businesses</p>
        </div>

        {/* Stats as chips inside the hero */}
        <div className="oa-stats-row">
          <div className="oa-stat-card">
            <div className="oa-stat-value">{counts.total}</div>
            <div className="oa-stat-label">Total</div>
          </div>
          <div className="oa-stat-card oa-stat-card--pending">
            <div className="oa-stat-value">{counts.pending}</div>
            <div className="oa-stat-label">Pending</div>
          </div>
          <div className="oa-stat-card oa-stat-card--confirmed">
            <div className="oa-stat-value">{counts.confirmed}</div>
            <div className="oa-stat-label">Confirmed</div>
          </div>
          <div className="oa-stat-card oa-stat-card--completed">
            <div className="oa-stat-value">{counts.completed}</div>
            <div className="oa-stat-label">Completed</div>
          </div>
          <div className="oa-stat-card oa-stat-card--cancelled">
            <div className="oa-stat-value">{counts.cancelled}</div>
            <div className="oa-stat-label">Cancelled</div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button key={f}
            data-filter={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}>
            <span>{f}</span>
            {f !== 'ALL' && counts[f.toLowerCase()] > 0 && (
              <span className="ma-filter-count">{counts[f.toLowerCase()]}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No {filter !== 'ALL' ? filter.toLowerCase() : ''} appointments</h3>
          <p>{filter !== 'ALL' ? 'Change the filter to see others' : 'No bookings yet'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(appt => (
            <AppointmentCard key={appt.id} appt={appt}
              onAction={handleAction} actionLoading={actionLoading} />
          ))}
        </div>
      )}
    </div>
  );
}