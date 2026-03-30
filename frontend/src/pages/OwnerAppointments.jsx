import { useEffect, useState } from 'react';
import {
  getBusinessAppointments,
  confirmAppointment,
  rejectAppointment,
  completeAppointment,
} from '../api/appointments';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';

const FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function formatTime(t) {
  if (!t) return '—';
  try { return String(t).slice(0, 5); } catch { return t; }
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN');
}

export default function OwnerAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  const fetchAppointments = () => {
    setLoading(true);
    setError('');
    getBusinessAppointments()
      .then((r) => setAppointments(r.data))
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
    : appointments.filter((a) => a.status === filter);

  const stats = {
    total:     appointments.length,
    pending:   appointments.filter((a) => a.status === 'PENDING').length,
    confirmed: appointments.filter((a) => a.status === 'CONFIRMED').length,
    completed: appointments.filter((a) => a.status === 'COMPLETED').length,
    cancelled: appointments.filter((a) => a.status === 'CANCELLED').length,
  };

  if (loading) return <div className="page-container"><Spinner message="Loading appointments..." /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Appointments Dashboard</h1>
        <p className="page-subtitle">Manage all bookings for your businesses</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ backgroundImage: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
            {stats.pending}
          </div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ backgroundImage: 'linear-gradient(135deg,#3B82F6,#2563EB)' }}>
            {stats.confirmed}
          </div>
          <div className="stat-label">Confirmed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ backgroundImage: 'linear-gradient(135deg,#10B981,#059669)' }}>
            {stats.completed}
          </div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f} {f !== 'ALL' && `(${appointments.filter((a) => a.status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No {filter !== 'ALL' ? filter.toLowerCase() : ''} appointments</h3>
          <p>{filter !== 'ALL' ? 'Change the filter to see other appointments' : 'No bookings received yet'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((appt) => {
            const customerName = appt.userName || appt.userEmail ||
                                 (appt.userId ? `User #${appt.userId}` : 'Unknown Customer');

            return (
              <div key={appt.id} className="appointment-card">
                <div className="appointment-card-header">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Customer */}
                    <div className="appointment-business" style={{ fontSize: '1rem' }}>
                      👤 {customerName}
                    </div>
                    {/* Service & Business */}
                    <div className="appointment-service" style={{ marginTop: 3 }}>
                      {appt.serviceName && <span>⚙️ {appt.serviceName}</span>}
                      {appt.businessName && <span style={{ marginLeft: 8 }}>🏢 {appt.businessName}</span>}
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>

                <div className="appointment-meta">
                  <span>📅 Date: {formatDate(appt.appointmentDate)}</span>
                  <span>🕐 Time: {formatTime(appt.appointmentTime)}</span>
                  <span>📥 Requested: {formatDateTime(appt.createdAt)}</span>
                  {appt.price && <span>💰 Price: ₹{appt.price}</span>}
                </div>

                {/* Actions */}
                <div className="appointment-actions">
                  {appt.status === 'PENDING' && (
                    <>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleAction(appt.id, 'confirm')}
                        disabled={actionLoading === `${appt.id}-confirm`}
                      >
                        {actionLoading === `${appt.id}-confirm` ? '⏳' : '✓ Confirm'}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleAction(appt.id, 'reject')}
                        disabled={actionLoading === `${appt.id}-reject`}
                      >
                        {actionLoading === `${appt.id}-reject` ? '⏳' : '✕ Reject'}
                      </button>
                    </>
                  )}
                  {appt.status === 'CONFIRMED' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAction(appt.id, 'complete')}
                      disabled={actionLoading === `${appt.id}-complete`}
                    >
                      {actionLoading === `${appt.id}-complete` ? '⏳' : '✓ Mark Complete'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
