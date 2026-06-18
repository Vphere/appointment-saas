import { useEffect, useState } from 'react';
import { getAllBusinesses, approveBusiness, rejectBusinessWithReason } from '../api/business';
import { getDocuments } from '../api/documents';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import './AdminApproval.css';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatINR = (val) => {
  const n = Number(val);
  if (!n) return '—';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)} L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)} K`;
  return `₹${n}`;
};

const DOC_LABELS = {
  PAN_CARD:                   '🪪 PAN Card',
  GST_CERTIFICATE:            '📄 GST Certificate',
  SHOP_ESTABLISHMENT_LICENSE: '🏪 Shop & Establishment License',
  TRADE_LICENSE:              '📋 Trade License',
  INCORPORATION_CERTIFICATE:  '🏛 Incorporation Certificate',
  UDYAM_CERTIFICATE:          '🏭 Udyam / MSME Certificate',
  OTHER:                      '📁 Other Document',
};

async function openDocumentWithAuth(fileUrl, originalName) {
  
  if (fileUrl && fileUrl.startsWith('https://res.cloudinary.com')) {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    const response = await api.get(fileUrl, { responseType: 'blob' });
    const blob = response.data;
    const objectUrl = URL.createObjectURL(blob);
    const tab = window.open(objectUrl, '_blank');
    if (tab) {
      tab.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
    }
  } catch (err) {
    alert('Failed to load document. Please try again.');
  }
}

function DocumentsSection({ businessId }) {
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(null); // docId being fetched

  useEffect(() => {
    getDocuments(businessId)
      .then(r => setDocs(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [businessId]);

  const handleView = async (doc) => {
    setLoadingDoc(doc.id);
    await openDocumentWithAuth(doc.fileUrl, doc.originalName);
    setLoadingDoc(null);
  };

  if (loading) return (
    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading documents…</div>
  );
  if (docs.length === 0) return (
    <div className="aa-no-docs">⚠️ No documents uploaded by owner</div>
  );

  return (
    <div className="aa-docs-grid">
      {docs.map(doc => (
        <div key={doc.id} className="aa-doc-chip">
          <span className="aa-doc-label">{DOC_LABELS[doc.documentType] || doc.documentType}</span>
          <span className="aa-doc-filename">{doc.originalName}</span>
          <button
            className="btn btn-outline btn-sm aa-doc-view-btn"
            onClick={() => handleView(doc)}
            disabled={loadingDoc === doc.id}
          >
            {loadingDoc === doc.id ? '⏳' : '👁 View'}
          </button>
        </div>
      ))}
    </div>
  );
}


function RejectModal({ onConfirm, onCancel, loading }) {
  const [reason, setReason]   = useState('');
  const [actions, setActions] = useState('');

  return (
    <div className="aa-preview-overlay" onClick={onCancel}>
      <div className="aa-preview-modal" style={{ maxWidth: 480 }}
           onClick={e => e.stopPropagation()}>
        <div className="aa-preview-header">
          <span>✕ Reject Business — Provide Reason</span>
          <button className="owner-modal-close" onClick={onCancel}>×</button>
        </div>
        <div style={{ padding: '20px 20px 24px' }}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Rejection Reason *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="e.g. PAN card scan is blurry and unreadable"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <span className="form-hint">
              Explain clearly why this application is being rejected.
            </span>
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Required Actions *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="e.g. Upload a clearer PAN scan. Provide GST certificate since turnover exceeds ₹20L."
              value={actions}
              onChange={e => setActions(e.target.value)}
            />
            <span className="form-hint">
              Tell the owner exactly what they need to fix before resubmitting.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button
              className="btn btn-danger"
              disabled={!reason.trim() || !actions.trim() || loading}
              onClick={() => onConfirm(reason.trim(), actions.trim())}
            >
              {loading ? '⏳ Rejecting...' : '✕ Confirm Rejection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Business Card ─────────────────────────────────────────────────
function BusinessCard({ b, onAction, actionLoading }) {
  const [expanded, setExpanded] = useState(false);
  const status = (b.status || b.approvalStatus || 'PENDING').toUpperCase();
  const isPending = status === 'PENDING';

  const gstRequired = b.annualTurnover && Number(b.annualTurnover) > 2_000_000;

  return (
    <div className="card aa-biz-card">

      {/* ── Top row ── */}
      <div className="aa-card-header">
        <div>
          <h3 className="aa-biz-name">{b.name}</h3>
          <div className="aa-biz-owner">
            Owner: <strong>{b.ownerName || b.ownerEmail || `ID #${b.ownerId || '?'}`}</strong>
            {b.ownerEmail && b.ownerName && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>· {b.ownerEmail}</span>
            )}
          </div>
          <div className="aa-biz-time">🕒 Submitted: {formatDateTime(b.createdAt)}</div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* ── Quick info chips ── */}
      <div className="aa-info-chips">
        {b.category && (
          <div className="aa-chip">
            <div className="aa-chip-label">CATEGORY</div>
            <div className="aa-chip-value">🏷 {b.category}</div>
          </div>
        )}
        {b.phone && (
          <div className="aa-chip">
            <div className="aa-chip-label">PHONE</div>
            <div className="aa-chip-value">📞 {b.phone}</div>
          </div>
        )}
        {b.businessType && (
          <div className="aa-chip">
            <div className="aa-chip-label">BUSINESS TYPE</div>
            <div className="aa-chip-value">🏛 {b.businessType.replace('_', ' ')}</div>
          </div>
        )}
        {b.annualTurnover && (
          <div className="aa-chip">
            <div className="aa-chip-label">ANNUAL TURNOVER</div>
            <div className="aa-chip-value">💰 {formatINR(b.annualTurnover)}</div>
          </div>
        )}
      </div>

      {/* ── Verification section ── */}
      <div className="aa-verify-row">
        {/* PAN */}
        <div className={`aa-verify-chip ${b.panNumber ? 'aa-verify-ok' : 'aa-verify-missing'}`}>
          <span className="aa-verify-icon">{b.panNumber ? '✓' : '✗'}</span>
          <div>
            <div className="aa-verify-type">PAN Number</div>
            <div className="aa-verify-val">{b.panNumber || 'Not provided'}</div>
          </div>
        </div>

        {/* GST */}
        <div className={`aa-verify-chip ${
          b.gstNumber ? 'aa-verify-ok' :
          gstRequired ? 'aa-verify-missing' : 'aa-verify-optional'
        }`}>
          <span className="aa-verify-icon">
            {b.gstNumber ? '✓' : gstRequired ? '✗' : '—'}
          </span>
          <div>
            <div className="aa-verify-type">
              GST Number {gstRequired && !b.gstNumber && <span className="aa-verify-req">(Required)</span>}
              {!gstRequired && <span className="aa-verify-opt">(Exempt)</span>}
            </div>
            <div className="aa-verify-val">{b.gstNumber || (gstRequired ? 'Not provided' : 'Below threshold')}</div>
          </div>
        </div>

        {/* Udyam */}
        {b.udyamNumber && (
          <div className="aa-verify-chip aa-verify-ok">
            <span className="aa-verify-icon">✓</span>
            <div>
              <div className="aa-verify-type">Udyam / MSME</div>
              <div className="aa-verify-val">{b.udyamNumber}</div>
            </div>
          </div>
        )}
      </div>

      {b.description && (
        <p className="aa-biz-desc">"{b.description}"</p>
      )}

      {/* ── Documents toggle ── */}
      <button
        className="aa-docs-toggle"
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? '▲ Hide Documents' : '📎 View Submitted Documents'}
      </button>

      {expanded && (
        <div className="aa-docs-section">
          <DocumentsSection businessId={b.id} />
        </div>
      )}

      {/* ── Actions ── */}
      {isPending ? (
        <div className="aa-actions">
          <button
            className="btn btn-success"
            onClick={() => onAction(b.id, 'approve')}
            disabled={!!actionLoading}
          >
            {actionLoading === `${b.id}-approve` ? '⏳ Approving...' : '✓ Approve'}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => onAction(b.id, 'reject')}
            disabled={!!actionLoading}
          >
            {actionLoading === `${b.id}-reject` ? '⏳ Rejecting...' : '✕ Reject'}
          </button>
        </div>
      ) : (
        <div className="aa-no-action">
          No actions available — business already {status.toLowerCase()}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function AdminApproval() {
  const [businesses, setBusinesses]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('PENDING');
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage]         = useState({ text: '', type: '' });
  const [rejectModal, setRejectModal] = useState(null); // stores businessId when open

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const res = await getAllBusinesses();
      setBusinesses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBusinesses(); }, []);

  // Replace the existing handleAction and add rejectModal state


  const handleAction = async (id, action) => {
    if (action === 'reject') {
      setRejectModal(id); // open modal instead of acting immediately
      return;
    }
    // approve path unchanged
    setActionLoading(`${id}-approve`);
    setMessage({ text: '', type: '' });
    try {
      await approveBusiness(id);
      setMessage({ text: '✓ Business approved successfully', type: 'success' });
      fetchBusinesses();
    } catch (e) {
      setMessage({ text: `✗ ${e.response?.data?.message || 'Failed to approve'}`, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async (reason, actions) => {
    const id = rejectModal;
    setActionLoading(`${id}-reject`);
    setMessage({ text: '', type: '' });
    try {
      await rejectBusinessWithReason(id, {
        rejectionReason: reason,
        requiredActions: actions,
      });
      setRejectModal(null);
      setMessage({ text: '✓ Business rejected with feedback sent', type: 'success' });
      fetchBusinesses();
    } catch (e) {
      setMessage({ text: `✗ ${e.response?.data?.message || 'Failed to reject'}`, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];
  const statusOf = (b) => (b.status || b.approvalStatus || '').toUpperCase();

  const counts = {
    ALL:      businesses.length,
    PENDING:  businesses.filter(b => statusOf(b) === 'PENDING').length,
    APPROVED: businesses.filter(b => statusOf(b) === 'APPROVED').length,
    REJECTED: businesses.filter(b => statusOf(b) === 'REJECTED').length,
  };

  const filtered = filter === 'ALL'
    ? businesses
    : businesses.filter(b => statusOf(b) === filter);

  if (loading) return <div className="page-container"><Spinner message="Loading businesses..." /></div>;

  return (
    <div className="page-container">
      <div className="page-header flex-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="page-title">Business Approvals</h1>
          <p className="page-subtitle">
            {counts.PENDING} business{counts.PENDING !== 1 ? 'es' : ''} pending review
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchBusinesses}>↻ Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total',    value: counts.ALL,      color: 'var(--primary-light)' },
          { label: 'Pending',  value: counts.PENDING,  color: 'var(--pending)' },
          { label: 'Approved', value: counts.APPROVED, color: 'var(--completed)' },
          { label: 'Rejected', value: counts.REJECTED, color: 'var(--cancelled)' },
        ].map(s => (
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
        {FILTERS.map(f => (
          <button key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}>
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
          {filtered.map(b => (
            <BusinessCard
              key={b.id}
              b={b}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {rejectModal && (
      <RejectModal
        loading={!!actionLoading}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectModal(null)}
      />
    )}
    </div>
  );
}