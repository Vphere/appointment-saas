import { useEffect, useState } from 'react';
import {
  getBusinessAppointments,
  confirmAppointment,
  rejectAppointment,
  completeAppointment,
} from '../api/appointments';
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
  const label = s.charAt(0) + s.slice(1).toLowerCase();
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

// ── Appointment card ──────────────────────────────────────────────
function AppointmentCard({ appt, onAction, actionLoading }) {
  const customerName = appt.userName || appt.userEmail ||
    (appt.userId ? `User #${appt.userId}` : 'Unknown Customer');

  const requestedLabel = appt.updatedAt ? 'Last Modified' : 'Requested On';
  const requestedValue = appt.updatedAt
    ? formatDateTime(appt.updatedAt)
    : formatDateTime(appt.createdAt);

  return (
    <div className="oa-card card">

      {/* ── Row 1: customer + status ── */}
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

      {/* ── Row 2: date · time · price ── */}
      <div className="oa-chips-row">
        <DetailChip icon="📅" label="Appointment Date" value={formatDate(appt.appointmentDate)} />
        <DetailChip icon="🕐" label="Time"             value={formatTime(appt.appointmentTime)} />
        <DetailChip icon="💰" label="Price"            value={appt.price ? `₹${appt.price}` : '—'} accent="price" />
      </div>

      {/* ── Row 3: requested on · service · business ── */}
      <div className="oa-chips-row">
        <DetailChip icon={appt.updatedAt ? '✏️' : '📥'} label={requestedLabel} value={requestedValue} />
        <DetailChip icon="⚙️" label="Service"  value={appt.serviceName  || '—'} />
        <DetailChip icon="🏢" label="Business" value={appt.businessName || '—'} />
      </div>

      {/* ── Action buttons ── */}
      {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
        <div className="oa-actions">
          {appt.status === 'PENDING' && (
            <>
              <button className="btn btn-success btn-sm"
                onClick={() => onAction(appt.id, 'confirm')}
                disabled={!!actionLoading}>
                {actionLoading === `${appt.id}-confirm` ? '⏳ Confirming…' : '✓ Confirm'}
              </button>
              <button className="btn btn-danger btn-sm"
                onClick={() => onAction(appt.id, 'reject')}
                disabled={!!actionLoading}>
                {actionLoading === `${appt.id}-reject` ? '⏳ Rejecting…' : '✕ Reject'}
              </button>
            </>
          )}
          {appt.status === 'CONFIRMED' && (
            <button className="btn btn-primary btn-sm"
              onClick={() => onAction(appt.id, 'complete')}
              disabled={!!actionLoading}>
              {actionLoading === `${appt.id}-complete` ? '⏳ Completing…' : '✓ Mark as Completed'}
            </button>
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

  const handleAction = async (id, action) => {
    setActionLoading(`${id}-${action}`);
    try {
      if (action === 'confirm')  await confirmAppointment(id);
      if (action === 'reject')   await rejectAppointment(id);
      if (action === 'complete') await completeAppointment(id);
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
      <div className="page-header">
        <h1 className="page-title">Appointments Dashboard</h1>
        <p className="page-subtitle">Manage all bookings across your businesses</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Stats row */}
      <div className="oa-stats-row">
        <StatCard label="Total"     value={counts.total}     color="var(--primary-light, #6c63ff)" />
        <StatCard label="Pending"   value={counts.pending}   color="#f59e0b" />
        <StatCard label="Confirmed" value={counts.confirmed} color="#38bdf8" />
        <StatCard label="Completed" value={counts.completed} color="#10b981" />
        <StatCard label="Cancelled" value={counts.cancelled} color="#ef4444" />
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}>
            {f} {f !== 'ALL' && `(${counts[f.toLowerCase()] ?? 0})`}
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