import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBusinesses, createBusiness } from '../api/business';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import '../styles/owner.css';

const STATUS_FILTERS = ['ALL', 'APPROVED', 'PENDING', 'REJECTED'];

export default function OwnerDashboard() {
  const [businesses, setBusinesses]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [filter, setFilter]           = useState('ALL');
  const [form, setForm] = useState({ name: '', description: '', city: '', address: '', phone: '', category: '' });
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const navigate = useNavigate();

  const fetchBusinesses = () => {
    setLoading(true);
    getMyBusinesses()
      .then((r) => setBusinesses(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchBusinesses(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createBusiness(form);
      setShowForm(false);
      setForm({ name: '', description: '', city: '', address: '', phone: '', category: '' });
      fetchBusinesses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create business');
    } finally {
      setSubmitting(false);
    }
  };

  const statusOf = (b) => (b.status || b.approvalStatus || '').toUpperCase();

  const filtered = filter === 'ALL'
    ? businesses
    : businesses.filter((b) => statusOf(b) === filter);

  if (loading) return <div className="page-container"><Spinner /></div>;

  return (
    <div className="page-container">
      <div className="page-header flex-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="page-title">My Businesses</h1>
          <p className="page-subtitle">{businesses.length} registered {businesses.length === 1 ? 'business' : 'businesses'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Business'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Register New Business</h3>
          <form onSubmit={handleCreate}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input className="form-input" placeholder="e.g. Elite Salon"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" placeholder="e.g. salon, spa, fitness"
                  value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">City *</label>
                <input className="form-input" placeholder="e.g. Mumbai"
                  value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="+91 98765 43210"
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address *</label>
                <input className="form-input" placeholder="e.g. 12 MG Road, Andheri West"
                  value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Tell customers about your business..."
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? '⏳ Submitting...' : '✓ Submit for Approval'}
            </button>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="owner-filter-bar">
        <label>Filter:</label>
        {STATUS_FILTERS.map((f) => {
          const count = f === 'ALL' ? businesses.length : businesses.filter((b) => statusOf(b) === f).length;
          return (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f} ({count})
            </button>
          );
        })}
      </div>

      {/* Business List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <h3>{filter === 'ALL' ? 'No businesses yet' : `No ${filter.toLowerCase()} businesses`}</h3>
          <p>{filter === 'ALL' ? 'Register your first business to get started' : 'Change the filter to see other statuses'}</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {filtered.map((b) => (
            <div key={b.id} className="owner-biz-card">
              <div className="owner-biz-header">
                <span className="owner-biz-name">{b.name}</span>
                <StatusBadge status={statusOf(b)} />
              </div>
              <div className="owner-biz-meta">
                {b.category && <span>Categoty: {b.category} </span>}
                {b.city && <span>📍 {b.city}</span>}
                {b.address && <span>🏠 {b.address}</span>}
                {b.phone && <span>📞 {b.phone}</span>}
              </div>
              {b.description && <p className="owner-biz-desc">{b.description}</p>}
              <div className="owner-biz-actions">
                <div
                  title={statusOf(b) !== "APPROVED"
                    ? "Your business is under approval. You can't add services right now."
                    : ""}
                  style={{ display: "inline-block" }}
                >
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={statusOf(b) !== "APPROVED"}
                    onClick={() => navigate(`/manage-services?businessId=${b.id}`)}
                    style={{
                      opacity: statusOf(b) !== "APPROVED" ? 0.5 : 1,
                      cursor: statusOf(b) !== "APPROVED" ? "not-allowed" : "pointer"
                    }}
                  >
                    ⚙️ Services
                  </button>
                </div>
                <div
                    title={statusOf(b) !== "APPROVED"
                      ? "Your business is under approval. You can't add working Hours right now."
                      : ""}
                    style={{ display: "inline-block" }}
                >
                  <button
                      className="btn btn-secondary btn-sm"
                      disabled={statusOf(b) !== "APPROVED"}
                      onClick={() => navigate(`/working-hours?businessId=${b.id}`)}
                      style={{
                          opacity: statusOf(b) !== "APPROVED" ? 0.5 : 1,
                          cursor: statusOf(b) !== "APPROVED" ? "not-allowed" : "pointer"
                      }}
                  >
                      🕐 Hours
                  </button>
                </div>
                <div
                  title={statusOf(b) !== "APPROVED"
                    ? "Your business is under approval. You can't see appointments right now."
                    : ""}
                  style={{ display: "inline-block" }}
                >
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={statusOf(b) !== "APPROVED"}
                    onClick={() => navigate(`/owner-appointments`)}
                    style={{
                        opacity: statusOf(b) !== "APPROVED" ? 0.5 : 1,
                        cursor: statusOf(b) !== "APPROVED" ? "not-allowed" : "pointer"
                    }}
                  >
                    📋 Appointments
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
