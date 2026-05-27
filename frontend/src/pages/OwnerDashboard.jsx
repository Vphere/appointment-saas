import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBusinesses } from '../api/business';
import Spinner from '../components/Spinner';
import CreateBusiness from './CreateBusiness';
import '../styles/owner.css';

const STATUS_FILTERS = ['ALL', 'APPROVED', 'PENDING', 'REJECTED'];
const STATUS_ORDER   = { PENDING: 0, APPROVED: 1, REJECTED: 2 };

// ── Draft flag for "form was open" ───────────────────────────────
// CreateBusiness.jsx already stores its own data under 'createBusiness_draft'.
// We store a separate tiny flag so OwnerDashboard knows to re-open the form
// even when all fields are still empty (user just clicked "+ Register Business").
const OD_FORM_OPEN_KEY = 'ownerDashboard_formOpen';
const saveFormOpen  = (v) => { try { sessionStorage.setItem(OD_FORM_OPEN_KEY, v ? '1' : '0'); } catch (_) {} };
const readFormOpen  = ()  => { try { return sessionStorage.getItem(OD_FORM_OPEN_KEY) === '1'; } catch (_) { return false; } };
const clearFormOpen = ()  => { try { sessionStorage.removeItem(OD_FORM_OPEN_KEY); } catch (_) {} };

const formatCreatedAt = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    + ', '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// ── Pending Timeline ─────────────────────────────────────────────
function PendingTimeline() {
  const steps = [
    { label: 'Submitted',    done: true,  active: false },
    { label: 'Under Review', done: false, active: true  },
    { label: 'Approved',     done: false, active: false },
  ];
  const items = [];
  steps.forEach((s, i) => {
    const circleClass = s.done ? 'od-tl-done' : s.active ? 'od-tl-active' : 'od-tl-inactive';
    const labelClass  = s.done ? 'od-tl-label-done' : s.active ? 'od-tl-label-active' : '';
    items.push(
      <div key={`node-${i}`} className="od-tl-node">
        <div className={`od-tl-circle ${circleClass}`}>
          {s.done ? '✓' : s.active ? '🔍' : '✓'}
        </div>
        <div className={`od-tl-label ${labelClass}`}>{s.label}</div>
      </div>
    );
    if (i < steps.length - 1) {
      items.push(
        <div key={`line-${i}`} className={`od-tl-line ${s.done ? 'od-tl-line-done' : ''}`} />
      );
    }
  });
  return <div className="od-timeline">{items}</div>;
}

// ── Info chip ─────────────────────────────────────────────────────
function InfoChip({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="od-info-chip">
      <span className="od-chip-icon">{icon}</span>
      <span className="od-chip-label">{label}:</span>
      <span className="od-chip-value">{value}</span>
    </div>
  );
}

// ── Business Card ─────────────────────────────────────────────────
function BusinessCard({ b }) {
  const navigate = useNavigate();
  const status   = (b.status || b.approvalStatus || '').toUpperCase();
  const approved = status === 'APPROVED';
  const pending  = status === 'PENDING';
  const rejected = status === 'REJECTED';
  const statusLabel = status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <div className={`od-biz-card card od-biz-card--${status.toLowerCase()}`}>

      {/* Row 1: name (left) + date + status (right) */}
      <div className="od-row-1">
        <div className="od-biz-name">{b.name}</div>
        <div className="od-row-1-right">
          {b.createdAt && (
            <span className="od-created-at">🗓 {formatCreatedAt(b.createdAt)}</span>
          )}
          <span className={`od-status-badge od-status-${status.toLowerCase()}`}>
            <span className="od-status-dot" />
            Status: {statusLabel}
          </span>
        </div>
      </div>

      {/* Row 2: category */}
      {b.category && (
        <div className="od-row-2">
          <span className="od-biz-category">Category: {b.category}</span>
        </div>
      )}

      {/* Row 3: info chips */}
      <div className="od-info-chips">
        <InfoChip icon="📞" label="Phone" value={b.phone} />
        <InfoChip icon="🏛"  label="Type"  value={b.businessType?.replace(/_/g, ' ')} />
        <InfoChip icon="🪪"  label="PAN"   value={b.panNumber} />
        {b.gstNumber && <InfoChip icon="📄" label="GST" value={b.gstNumber} />}
      </div>

      {/* Row 4: description */}
      {b.description && (
        <p className="od-biz-desc">
          <span className="od-desc-label">About: </span>
          {b.description}
        </p>
      )}

      {/* PENDING */}
      {pending && (
        <>
          <PendingTimeline />
          <div className="od-pending-note">
            ⏳ Your application is under review. You'll be notified once approved and can start adding services.
          </div>
        </>
      )}

      {/* REJECTED */}
      {rejected && (
        <div className="od-rejected-note">
          ❌ Application rejected. Please contact support or re-submit with correct documents.
        </div>
      )}

      {/* APPROVED */}
      {approved && (
        <div className="od-biz-actions">
          <div className="od-action-tooltip-wrap">
            <button
              className="btn btn-secondary btn-sm od-action-btn od-action-btn--services"
              onClick={() => navigate(`/manage-services?businessId=${b.id}`)}
            >
              ⚙️ Manage Services
            </button>
            <div className="od-tooltip">
              <div className="od-tooltip-title">Manage Services</div>
              Add, edit, or remove services your business offers — configure duration, pricing, staff assignment and availability for each service.
            </div>
          </div>

          <div className="od-action-tooltip-wrap">
            <button
              className="btn btn-secondary btn-sm od-action-btn od-action-btn--settings"
              onClick={() => navigate('/business-settings')}
            >
              🕐 Working Hours & Settings
            </button>
            <div className="od-tooltip">
              <div className="od-tooltip-title">Business Settings</div>
              Set working hours, mark holidays, upload photos for your listing, and manage all other business configuration.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading]       = useState(true);
  // Lazy-init: read flag synchronously so form is open from frame 0 on refresh/back-nav
  const [showForm, setShowForm]     = useState(() => readFormOpen());
  const [filter, setFilter]         = useState('ALL');

  const openForm = () => {
    saveFormOpen(true);
    setShowForm(true);
  };

  const closeForm = () => {
    clearFormOpen();
    setShowForm(false);
  };

  const fetchBusinesses = () => {
    setLoading(true);
    getMyBusinesses()
      .then(r => setBusinesses(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBusinesses(); }, []);

  const statusOf = b => (b.status || b.approvalStatus || '').toUpperCase();

  const counts = {
    ALL:      businesses.length,
    APPROVED: businesses.filter(b => statusOf(b) === 'APPROVED').length,
    PENDING:  businesses.filter(b => statusOf(b) === 'PENDING').length,
    REJECTED: businesses.filter(b => statusOf(b) === 'REJECTED').length,
  };

  const filtered = (filter === 'ALL'
    ? businesses
    : businesses.filter(b => statusOf(b) === filter)
  ).slice().sort((a, b) => {
    const aO = STATUS_ORDER[statusOf(a)] ?? 99;
    const bO = STATUS_ORDER[statusOf(b)] ?? 99;
    return aO - bO;
  });

  if (loading) return <div className="page-container"><Spinner /></div>;

  return (
    <div className="page-container">
      <div className="page-header flex-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="page-title">My Businesses</h1>
          <p className="page-subtitle">
            {businesses.length} registered {businesses.length === 1 ? 'business' : 'businesses'}
          </p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={openForm}>
            + Register Business
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 28, padding: '28px 32px' }}>
          <CreateBusiness
            onSuccess={() => { closeForm(); fetchBusinesses(); }}
            onCancel={closeForm}
          />
        </div>
      )}

      {!showForm && (
        <div className="owner-filter-bar">
          <label>Filter:</label>
          {STATUS_FILTERS.map(f => (
            <button key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}>
              {f} ({counts[f] ?? 0})
            </button>
          ))}
        </div>
      )}

      {!showForm && (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <h3>{filter === 'ALL' ? 'No businesses yet' : `No ${filter.toLowerCase()} businesses`}</h3>
            <p>{filter === 'ALL' ? 'Register your first business to get started' : 'Try a different filter'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(b => <BusinessCard key={b.id} b={b} />)}
          </div>
        )
      )}
    </div>
  );
}