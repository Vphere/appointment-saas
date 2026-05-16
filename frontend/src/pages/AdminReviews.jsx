import { useEffect, useState } from 'react';
import { getAllReviewsAdmin, removeReviewAdmin, restoreReviewAdmin } from '../api/admin';
import Spinner from '../components/Spinner';
import './AdminReviews.css';

const REMOVAL_REASONS = [
  'Offensive or abusive language',
  'Spam or fake review',
  'Irrelevant content',
  'Harassment or personal attack',
  'Misinformation',
  'Other',
];

const StarDisplay = ({ rating }) => (
  <span className="arv-stars">
    {[1,2,3,4,5].map((s) => (
      <span key={s} style={{ color: s <= rating ? '#f59e0b' : 'rgba(255,255,255,0.15)' }}>★</span>
    ))}
    <span className="arv-rating-num">{rating}/5</span>
  </span>
);

const formatDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Remove reason modal ──────────────────────────────────────────
function RemoveModal({ review, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState(REMOVAL_REASONS[0]);
  const [details, setDetails] = useState('');

  return (
    <div className="arv-overlay" onClick={onClose}>
      <div className="arv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="arv-modal-icon">🛡️</div>
        <h3>Remove Review</h3>
        <p className="arv-modal-sub">
          This review will be hidden from public. The user will see a notice
          explaining why their review was removed.
        </p>

        {review.comment && (
          <blockquote className="arv-modal-quote">"{review.comment}"</blockquote>
        )}

        <div className="arv-modal-field">
          <label>Reason for removal</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REMOVAL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="arv-modal-field">
          <label>Additional details <span>(optional)</span></label>
          <textarea
            rows={3}
            placeholder="Add any specific details that will help the user understand…"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        <div className="arv-modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className="btn btn-danger"
            disabled={loading}
            onClick={() => onConfirm({ reason, details })}
          >
            {loading ? '⏳ Removing…' : '🛡 Remove Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single review card ───────────────────────────────────────────
function ReviewCard({ review, onRemove, onRestore, actionLoading }) {
  const isRemoved = review.removedByAdmin;
  const busy = actionLoading === review.id;

  return (
    <div className={`arv-card card ${isRemoved ? 'arv-card-removed' : ''}`}>

      {/* Removed banner */}
      {isRemoved && (
        <div className="arv-removed-banner">
          <span>🛡️ Removed by admin</span>
          <span className="arv-removed-reason">Reason: {review.removalReason}</span>
          <span className="arv-removed-date">{formatDate(review.removedAt)}</span>
        </div>
      )}

      {/* Top row: user + rating + actions */}
      <div className="arv-card-top">
        <div className="arv-user">
          <div className="arv-avatar">
            {review.customerName ? review.customerName.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <div className="arv-user-name">{review.customerName || 'Unknown User'}</div>
            <div className="arv-user-email">{review.customerEmail || ''}</div>
          </div>
        </div>

        <div className="arv-card-right">
          <StarDisplay rating={review.rating} />
          {!isRemoved ? (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onRemove(review)}
              disabled={busy || !!actionLoading}
            >
              {busy ? '⏳' : '🛡 Remove'}
            </button>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onRestore(review.id)}
              disabled={busy || !!actionLoading}
            >
              {busy ? '⏳' : '↩ Restore'}
            </button>
          )}
        </div>
      </div>

      {/* Review content */}
      {review.comment && (
        <p className={`arv-comment ${isRemoved ? 'arv-comment-dimmed' : ''}`}>
          "{review.comment}"
        </p>
      )}

      {/* Meta info row */}
      <div className="arv-meta-row">
        {review.businessName && (
          <span className="arv-meta-chip arv-chip-biz">🏢 {review.businessName}</span>
        )}
        {review.serviceName && (
          <span className="arv-meta-chip arv-chip-service">⚙️ {review.serviceName}</span>
        )}
        {review.appointmentDate && (
          <span className="arv-meta-chip arv-chip-date">
            📅 Appointment: {formatDate(review.appointmentDate)}
          </span>
        )}
        {review.appointmentId && (
          <span className="arv-meta-chip arv-chip-id">#{review.appointmentId}</span>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function AdminReviews() {
  const [reviews, setReviews]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterRating, setFilterRating] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL | ACTIVE | REMOVED
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage]         = useState({ text: '', type: '' });
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const fetchReviews = () => {
    setLoading(true);
    getAllReviewsAdmin()
      .then((r) => setReviews(Array.isArray(r.data) ? r.data : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReviews(); }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3500);
  };

  const handleRemove = async ({ reason, details }) => {
    setRemoveLoading(true);
    try {
      const res = await removeReviewAdmin(removeTarget.id, { reason, details });
      setReviews((prev) => prev.map((r) => r.id === removeTarget.id ? res.data : r));
      showMsg('✓ Review removed. User will see the removal notice.');
      setRemoveTarget(null);
    } catch {
      showMsg('✗ Failed to remove review', 'error');
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleRestore = async (id) => {
    setActionLoading(id);
    try {
      const res = await restoreReviewAdmin(id);
      setReviews((prev) => prev.map((r) => r.id === id ? res.data : r));
      showMsg('✓ Review restored successfully');
    } catch {
      showMsg('✗ Failed to restore review', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const active  = reviews.filter((r) => !r.removedByAdmin);
  const removed = reviews.filter((r) =>  r.removedByAdmin);

  const avgRating = active.length > 0
    ? (active.reduce((s, r) => s + r.rating, 0) / active.length).toFixed(1)
    : null;

  const ratingCounts = [1,2,3,4,5].reduce((acc, n) => {
    acc[n] = active.filter((r) => r.rating === n).length;
    return acc;
  }, {});

  const filtered = reviews.filter((r) => {
    if (filterStatus === 'ACTIVE'   &&  r.removedByAdmin) return false;
    if (filterStatus === 'REMOVED'  && !r.removedByAdmin) return false;
    if (filterRating !== 'ALL' && r.rating !== Number(filterRating)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      r.comment?.toLowerCase().includes(q) ||
      r.customerName?.toLowerCase().includes(q) ||
      r.customerEmail?.toLowerCase().includes(q) ||
      r.businessName?.toLowerCase().includes(q) ||
      r.serviceName?.toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="page-container"><Spinner message="Loading reviews…" /></div>;

  return (
    <div className="page-container arv-root">

      {/* Header */}
      <div className="page-header flex-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="page-title">Review Moderation</h1>
          <p className="page-subtitle">
            {active.length} active · {removed.length} removed
            {avgRating && ` · Avg rating: ${avgRating} ⭐`}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchReviews}>↻ Refresh</button>
      </div>

      {/* Rating distribution */}
      {active.length > 0 && (
        <div className="arv-dist-card card">
          <div className="arv-dist-title">Rating Distribution (active reviews)</div>
          <div className="arv-dist-bars">
            {[5,4,3,2,1].map((n) => {
              const count = ratingCounts[n] || 0;
              const pct   = active.length > 0 ? Math.round((count / active.length) * 100) : 0;
              return (
                <div key={n} className="arv-dist-row">
                  <span className="arv-dist-label">{'★'.repeat(n)}</span>
                  <div className="arv-dist-track">
                    <div className="arv-dist-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="arv-dist-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
          style={{ marginBottom: 16 }}>
          {message.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="arv-toolbar">
        <input
          type="text"
          className="arv-search"
          placeholder="🔍  Search by comment, user, business or service…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="arv-filter-row">
          {/* Status filter */}
          <div className="filter-bar" style={{ margin: 0 }}>
            {[
              { val: 'ALL',     label: `All (${reviews.length})` },
              { val: 'ACTIVE',  label: `Active (${active.length})` },
              { val: 'REMOVED', label: `Removed (${removed.length})` },
            ].map((f) => (
              <button key={f.val}
                className={`filter-btn ${filterStatus === f.val ? 'active' : ''}`}
                onClick={() => setFilterStatus(f.val)}>
                {f.label}
              </button>
            ))}
          </div>
          {/* Rating filter */}
          <div className="filter-bar" style={{ margin: 0 }}>
            {['ALL','5','4','3','2','1'].map((r) => (
              <button key={r}
                className={`filter-btn ${filterRating === r ? 'active' : ''}`}
                onClick={() => setFilterRating(r)}>
                {r === 'ALL' ? 'All ★' : `${'★'.repeat(Number(r))}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⭐</div>
          <h3>No reviews found</h3>
          <p>Try a different filter or search</p>
        </div>
      ) : (
        <div className="arv-list">
          {filtered.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              onRemove={setRemoveTarget}
              onRestore={handleRestore}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Remove modal */}
      {removeTarget && (
        <RemoveModal
          review={removeTarget}
          onConfirm={handleRemove}
          onClose={() => setRemoveTarget(null)}
          loading={removeLoading}
        />
      )}
    </div>
  );
}