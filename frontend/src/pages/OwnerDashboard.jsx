import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBusinesses, requestDeleteBusiness, confirmDeleteBusiness, getDeletePreflight } from '../api/business';
import Spinner from '../components/Spinner';
import CreateBusiness from './CreateBusiness';
import '../styles/owner.css';

const STATUS_FILTERS = ['ALL', 'APPROVED', 'PENDING', 'REJECTED'];
const STATUS_ORDER   = { PENDING: 0, APPROVED: 1, REJECTED: 2 };

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
function BusinessCard({ b, onDelete, onResubmitSuccess }) {
  const navigate  = useNavigate();
  const [editing, setEditing] = useState(false);
  const status    = (b.status || b.approvalStatus || '').toUpperCase();
  const approved  = status === 'APPROVED';
  const pending   = status === 'PENDING';
  const rejected  = status === 'REJECTED';
  const statusLabel = status.charAt(0) + status.slice(1).toLowerCase();

  if (editing) {
    return (
      <div className="card" style={{ padding: '28px 32px' }}>
        <CreateBusiness
          existingBusiness={b}
          onSuccess={() => { setEditing(false); onResubmitSuccess(); }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className={`od-biz-card card od-biz-card--${status.toLowerCase()}`}>

      {/* Row 1: name + date + status */}
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

      {/* Info chips */}
      <div className="od-info-chips">
        <InfoChip icon="📞" label="Phone" value={b.phone} />
        <InfoChip icon="🏛"  label="Type"  value={b.businessType?.replace(/_/g, ' ')} />
        <InfoChip icon="🪪"  label="PAN"   value={b.panNumber} />
        {b.gstNumber && <InfoChip icon="📄" label="GST" value={b.gstNumber} />}
      </div>

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
            ⏳ Your application is under review. You'll be notified once approved.
          </div>
        </>
      )}

      {/* REJECTED — rich feedback */}
      {rejected && (
        <div className="od-rejected-box">
          <div className="od-rejected-header">❌ Application Rejected</div>
          {b.rejectionReason && (
            <div className="od-rejected-section">
              <div className="od-rejected-section-label">Reason:</div>
              <div className="od-rejected-section-body">{b.rejectionReason}</div>
            </div>
          )}
          {b.requiredActions && (
            <div className="od-rejected-section">
              <div className="od-rejected-section-label">What you need to do:</div>
              <div className="od-rejected-section-body">{b.requiredActions}</div>
            </div>
          )}
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => setEditing(true)}
          >
            ✏️ Edit & Resubmit
          </button>
        </div>
      )}

      {/* APPROVED — action buttons + delete */}
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
              Add, edit, or remove services your business offers.
            </div>
          </div>
          <div className="od-action-tooltip-wrap">
            <button
              className="btn btn-secondary btn-sm od-action-btn od-action-btn--settings"
              onClick={() => navigate(`/business-settings?businessId=${b.id}`)}
            >
              🕐 Working Hours & Settings
            </button>
            <div className="od-tooltip">
              <div className="od-tooltip-title">Business Settings</div>
              Set working hours, mark holidays, and manage business configuration.
            </div>
          </div>
          <div style={{ flex: 1 }} />
          {/* onClick correctly calls onDelete passed from parent */}
          <button
            className="btn btn-danger btn-sm od-action-btn"
            onClick={onDelete}
          >
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DeleteBusinessModal({ business, onClose, onSuccess }) {
  const [step, setStep]             = useState(0); // 0=loading preflight, 1=warning, 2=otp
  const [preflight, setPreflight]   = useState(null);
  const [otp, setOtp]               = useState('');
  const [typedName, setTypedName]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Load preflight data as soon as modal opens
  useEffect(() => {
    getDeletePreflight(business.id)
      .then(r => { setPreflight(r.data); setStep(1); })
      .catch(e => setError(
        e.response?.data?.message || 'Failed to load deletion details.'
      ));
  }, [business.id]);

  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await requestDeleteBusiness(business.id);
      setStep(2);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (typedName !== business.name) {
      setError('Business name does not match. Please type it exactly as shown.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await confirmDeleteBusiness(business.id, { otp, businessName: typedName });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || 'Deletion failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="owner-modal-overlay" onClick={onClose}>
      <div className="owner-modal" style={{ maxWidth: 460 }}
           onClick={e => e.stopPropagation()}>

        <div className="owner-modal-header">
          <span className="owner-modal-title" style={{ color: '#ef4444' }}>
            🗑 Delete Business
          </span>
          <button className="owner-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Step 0: Loading preflight */}
        {step === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center',
                        color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {error
              ? <div className="alert alert-error">{error}</div>
              : '⏳ Checking business data...'}
          </div>
        )}

        {/* Step 1: Warning with real counts */}
        {step === 1 && preflight && (
          <>
            <div className="od-delete-warning-box">
              <p className="od-delete-warning-title">
                You are about to delete <strong>{business.name}</strong>
              </p>
              <p className="od-delete-warning-sub">
                This will permanently remove the business. Here's what will be affected:
              </p>
              <ul className="od-delete-consequences">
                {/* Highlight active appointments prominently if any exist */}
                {preflight.activeAppointmentCount > 0 ? (
                  <li className="od-delete-consequence-critical">
                    📅 <strong>{preflight.activeAppointmentCount} active appointment
                    {preflight.activeAppointmentCount !== 1 ? 's' : ''} will be
                    cancelled</strong> and customers will be notified by email
                  </li>
                ) : (
                  <li>📅 No active appointments — safe to delete</li>
                )}
                <li>
                  ⚙️ {preflight.serviceCount} service
                  {preflight.serviceCount !== 1 ? 's' : ''} will be deactivated
                </li>
                <li>🕐 Working hours and holidays will be removed</li>
                <li>📄 All uploaded documents will be deleted</li>
                <li>🖼 All business photos will be deleted</li>
                <li>✅ Completed appointments and reviews are preserved for records</li>
              </ul>
              <p className="od-delete-cannot-undo">⚠️ This action cannot be undone.</p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-danger" onClick={handleSendOtp} disabled={loading}>
                {loading ? '⏳ Sending...' : 'Continue → Send Verification Code'}
              </button>
            </div>
          </>
        )}

        {/* Step 2: OTP + typed name */}
        {step === 2 && (
          <>
            <div className="od-delete-otp-info">
              📧 A 6-digit verification code has been sent to your registered
              email. Enter it below along with your business name to confirm deletion.
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Verification Code *</label>
              <input
                className="form-input cb-mono"
                placeholder="Enter 6-digit code"
                maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                style={{ letterSpacing: '0.25em', fontSize: '1.2rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Type business name to confirm *</label>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                Type exactly: <strong style={{ color: '#ef4444' }}>{business.name}</strong>
              </p>
              <input
                className="form-input"
                placeholder={business.name}
                value={typedName}
                onChange={e => { setTypedName(e.target.value); setError(''); }}
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10,
                          justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSendOtp}
                disabled={loading}
                style={{ fontSize: '0.76rem' }}
              >
                Resend Code
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button
                  className="btn btn-danger"
                  onClick={handleConfirmDelete}
                  disabled={loading || otp.length !== 6 || !typedName}
                >
                  {loading ? '⏳ Deleting...' : '🗑 Permanently Delete'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(() => readFormOpen());
  const [filter, setFilter]         = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null); // ✓ inside component

  const openForm  = () => { saveFormOpen(true);  setShowForm(true);  };
  const closeForm = () => { clearFormOpen();      setShowForm(false); };

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
            {filtered.map(b => (
              <BusinessCard
                key={b.id}
                b={b}
                onDelete={() => setDeleteTarget(b)}        
                onResubmitSuccess={() => fetchBusinesses()}
              />
            ))}
          </div>
        )
      )}

      {/* ✓ deleteTarget (not deleteConfirm), inside component return */}
      {deleteTarget && (
        <DeleteBusinessModal
          business={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => { setDeleteTarget(null); fetchBusinesses(); }}
        />
      )}
    </div>
  );
}