import { useEffect, useState } from 'react';
import { getAllBusinesses, getPendingBusinesses, approveBusiness, rejectBusiness } from '../api/business';
import axiosInstance from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import './AdminApproval.css';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export default function AdminApproval() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const res = await getAllBusinesses(); // ✅ ALWAYS FETCH ALL
      const data = Array.isArray(res.data) ? res.data : [];
      setBusinesses(data);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBusinesses(); }, []);

  const handleAction = async (id, action) => {
    setActionLoading(`${id}-${action}`);
    setMessage({ text: '', type: '' });
    try {
      if (action === 'approve') await approveBusiness(id);
      if (action === 'reject') await rejectBusiness(id);
      setMessage({ text: `✓ Business ${action}d successfully`, type: 'success' });
      fetchBusinesses();
    } catch (e) {
      const msg = e.response?.data?.message || `Failed to ${action}`;
      setMessage({ text: `✗ ${msg}`, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

  const filtered = filter === 'ALL'
    ? businesses
    : businesses.filter((b) => {
        const status = (b.status || b.approvalStatus || '').toUpperCase();
        return status === filter;
      });

  const counts = {
    ALL: businesses.length,
    PENDING: businesses.filter((b) => (b.status || b.approvalStatus || '').toUpperCase() === 'PENDING').length,
    APPROVED: businesses.filter((b) => (b.status || b.approvalStatus || '').toUpperCase() === 'APPROVED').length,
    REJECTED: businesses.filter((b) => (b.status || b.approvalStatus || '').toUpperCase() === 'REJECTED').length,
  };

  if (loading) return <div className="page-container"><Spinner message="Loading businesses..." /></div>;

  return (
    <div className="page-container">
      <div className="page-header flex-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="page-title">Business Approvals</h1>
          <p className="page-subtitle">{counts.PENDING} business{counts.PENDING !== 1 ? 'es' : ''} pending review</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchBusinesses}>↻ Refresh</button>
      </div>

      {/* Stats row */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total', value: counts.ALL, color: 'var(--primary-light)' },
          { label: 'Pending', value: counts.PENDING, color: 'var(--pending)' },
          { label: 'Approved', value: counts.APPROVED, color: 'var(--completed)' },
          { label: 'Rejected', value: counts.REJECTED, color: 'var(--cancelled)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ backgroundImage: `linear-gradient(135deg, ${s.color}, ${s.color})` }}>
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {/* Filter tabs */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h3>No {filter !== 'ALL' ? filter.toLowerCase() : ''} businesses</h3>
          <p>{filter === 'PENDING' ? 'All caught up!' : 'Nothing to show here'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((b) => {
            const status = (b.status || b.approvalStatus || 'PENDING').toUpperCase();
            return (
              <div key={b.id} className="card">
                <div className="card-header">
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{b.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 2 }}>
                      Owner: {b.ownerName || b.ownerEmail || `ID #${b.ownerId || b.userId || '?'}`}
                    </p>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                      🕒 Requested on: {formatDateTime(b.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, margin: '12px 0' }}>
                  {[
                    { label: 'CITY', value: b.city ? `📍 ${b.city}` : null },
                    { label: 'ADDRESS', value: b.address ? `🏠 ${b.address}` : null },
                    { label: 'CATEGORY', value: b.category ? `🏷 ${b.category}` : null },
                    { label: 'PHONE', value: b.phone ? `📞 ${b.phone}` : null },
                  ].filter((x) => x.value).map((x) => (
                    <div key={x.label}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>{x.label}</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{x.value}</div>
                    </div>
                  ))}
                </div>

                {b.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16 }}>
                    {b.description}
                  </p>
                )}

                {status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn btn-success"
                      onClick={() => handleAction(b.id, 'approve')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === `${b.id}-approve` ? '⏳ Approving...' : '✓ Approve'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleAction(b.id, 'reject')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === `${b.id}-reject` ? '⏳ Rejecting...' : '✕ Reject'}
                    </button>
                  </div>
                )}
                {status !== 'PENDING' && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    No actions available — business already {status.toLowerCase()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}