import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApprovedBusinesses } from '../api/business';
import { getAverageRating } from '../api/reviews';
import Spinner from '../components/Spinner';
import './BusinessList.css';

const SORT_OPTIONS = [
  { value: 'default',     label: 'Default' },
  { value: 'rating_desc', label: 'Top Rated' },
  { value: 'name_asc',    label: 'Name A → Z' },
  { value: 'name_desc',   label: 'Name Z → A' },
];

// Business type display config
const BUSINESS_TYPES = [
  { value: 'ALL',             label: 'All Types',         icon: '🏢' },
  { value: 'SOLE_PROPRIETOR', label: 'Sole Proprietor',   icon: '👤' },
  { value: 'PARTNERSHIP',     label: 'Partnership',       icon: '🤝' },
  { value: 'PRIVATE_LIMITED', label: 'Private Limited',   icon: '🏛️' },
  { value: 'LLP',             label: 'LLP',               icon: '⚖️' },
  { value: 'OTHER',           label: 'Other',             icon: '🏗️' },
];
const BTYPE_MAP = Object.fromEntries(BUSINESS_TYPES.map(t => [t.value, t]));

// Derive 1-2 initials from the business name for the avatar
function getBizInitials(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Deterministic gradient picked from the business id so it never changes
const AVATAR_GRADIENTS = [
  ['#6366f1', '#8b5cf6'], // indigo → violet
  ['#0ea5e9', '#6366f1'], // sky → indigo
  ['#10b981', '#0ea5e9'], // emerald → sky
  ['#f59e0b', '#ef4444'], // amber → red
  ['#8b5cf6', '#ec4899'], // violet → pink
  ['#14b8a6', '#6366f1'], // teal → indigo
];
function getBizGradient(id) {
  return AVATAR_GRADIENTS[Number(id) % AVATAR_GRADIENTS.length];
}

function formatBusinessType(raw) {
  if (!raw) return null;
  return BTYPE_MAP[raw] || { label: raw, icon: '🏢' };
}

function BusinessCard({ business, rating, onClick }) {
  const typeInfo   = formatBusinessType(business.businessType);
  const initials   = getBizInitials(business.name);
  const [c1, c2]   = getBizGradient(business.id);

  return (
    <div
      className="bl-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Header */}
      <div className="bl-card-image">
        {/* Initials avatar — universal, not category-specific */}
        <div className="bl-card-avatar" style={{
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
        }}>
          {initials}
        </div>
        {rating !== null && rating !== undefined && (
          <span className="bl-card-rating-badge">★ {Number(rating).toFixed(1)}</span>
        )}
      </div>

      <div className="bl-card-body">
        {/* Name */}
        <h3 className="bl-card-name">{business.name}</h3>

        {/* Business type pill: icon · Type · Actual name */}
        {typeInfo && business.businessType && business.businessType !== 'OTHER' && (
          <span className="bl-card-type-badge">
            <span>{typeInfo.icon}</span>
            <span className="bl-card-type-label">Type</span>
            <span className="bl-card-type-sep">·</span>
            <span className="bl-card-type-name">{typeInfo.label}</span>
          </span>
        )}

        {/* Description — icon · About · text (2-line clamp) */}
        {business.description && (
          <div className="bl-card-about-row">
            <span className="bl-card-about-icon">📋</span>
            <span className="bl-card-about-label">About&nbsp;</span>
            <span className="bl-card-about-text">{business.description}</span>
          </div>
        )}

        {/* Meta rows */}
        <div className="bl-card-meta-rows">
          {business.phone && (
            <div className="bl-card-meta-row">
              <span className="bl-card-meta-icon">📞</span>
              <span className="bl-card-meta-label">Phone&nbsp;</span>
              <span className="bl-card-meta-value">{business.phone}</span>
            </div>
          )}
        </div>

        {/* View Details button */}
        <button className="bl-card-btn">
          View Details
          <span className="bl-card-btn-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);
  const [ratings, setRatings]       = useState({});
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();

  // ── Filter state ───────────────────────────────────────────────
  const [search, setSearch]           = useState('');
  const [sortBy, setSortBy]           = useState('default');
  const [minRating, setMinRating]     = useState(0);
  const [bizType, setBizType]         = useState('ALL');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    getApprovedBusinesses()
      .then(async (res) => {
        const bizList = Array.isArray(res.data) ? res.data : [];
        setBusinesses(bizList);

        const rMap = {};
        await Promise.all(
          bizList.map(async (b) => {
            try {
              const r = await getAverageRating(b.id);
              rMap[b.id] = r.data ? Number(r.data) : null;
            } catch {
              rMap[b.id] = null;
            }
          })
        );
        setRatings(rMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Derive available types ─────────────────────────────────────
  const availableTypes = useMemo(() => {
    const seen = new Set(businesses.map(b => b.businessType).filter(Boolean));
    return BUSINESS_TYPES.filter(t => t.value === 'ALL' || seen.has(t.value));
  }, [businesses]);

  // ── Filter + sort ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = businesses.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        b.name?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.phone?.toLowerCase().includes(q) ||
        b.ownerName?.toLowerCase().includes(q);

      const bRating = ratings[b.id];
      const matchRating =
        minRating === 0 ||
        (bRating !== null && bRating !== undefined && bRating >= minRating);

      const matchType = bizType === 'ALL' || b.businessType === bizType;

      return matchSearch && matchRating && matchType;
    });

    switch (sortBy) {
      case 'rating_desc':
        list = [...list].sort((a, b) => (ratings[b.id] ?? -1) - (ratings[a.id] ?? -1));
        break;
      case 'name_asc':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        list = [...list].sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }
    return list;
  }, [businesses, ratings, search, sortBy, minRating, bizType]);

  const activeFilterCount = [
    sortBy !== 'default',
    minRating > 0,
    bizType !== 'ALL',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSortBy('default');
    setMinRating(0);
    setBizType('ALL');
    setSearch('');
  };

  const handleHeroPill = (type, value) => {
    resetFilters();
    if (type === 'sort') setSortBy(value);
    if (type === 'type') setBizType(value);
  };

  if (loading) return <div className="page-container"><Spinner message="Loading businesses..." /></div>;

  return (
    <div className="page-container bl-root">

      {/* ── Hero banner ── */}
      <div className="bl-hero">
        <div className="bl-hero-title">✦ Browse &amp; Explore</div>
        <h1 className="bl-hero-headline">Discover Businesses</h1>
        <p className="bl-hero-sub">
          Explore verified businesses on BookEase — each offering a range of bookable services. Browse by name or filter by rating and type to find the right business for your needs.
        </p>
        <div className="bl-hero-pills">
          <button className={`bl-hero-pill${sortBy === 'rating_desc' ? ' active' : ''}`} onClick={() => handleHeroPill('sort', 'rating_desc')}>⭐ Top Rated</button>
          <button className={`bl-hero-pill${bizType === 'SOLE_PROPRIETOR' ? ' active' : ''}`} onClick={() => handleHeroPill('type', 'SOLE_PROPRIETOR')}>👤 Sole Proprietors</button>
          <button className={`bl-hero-pill${bizType === 'PRIVATE_LIMITED' ? ' active' : ''}`} onClick={() => handleHeroPill('type', 'PRIVATE_LIMITED')}>🏛️ Private Limited</button>
          <button className={`bl-hero-pill${bizType === 'PARTNERSHIP' ? ' active' : ''}`} onClick={() => handleHeroPill('type', 'PARTNERSHIP')}>🤝 Partnerships</button>
        </div>
      </div>

      {/* ── Top bar ── */}
      <div className="bl-topbar">
        <div className="bl-topbar-left">
          <p className="page-subtitle" style={{ margin: 0 }}>
            <span className="bl-count">{filtered.length}</span>
            <span style={{ color: 'var(--text-muted)' }}> of {businesses.length} businesses</span>
            {activeFilterCount > 0 && (
              <button className="bl-filter-badge" onClick={resetFilters}>
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} · clear
              </button>
            )}
          </p>
        </div>
        <div className="bl-topbar-right">
          <div className="bl-search-wrap">
            <span className="bl-search-icon">🔍</span>
            <input
              className="bl-search-input"
              placeholder="Search businesses, owners…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="bl-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          <button
            className={`bl-sidebar-toggle${sidebarOpen ? ' active' : ''}`}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="20" y2="12"/>
              <line x1="12" y1="18" x2="20" y2="18"/>
            </svg>
            {sidebarOpen ? 'Hide filters' : 'Show filters'}
            {activeFilterCount > 0 && <span className="bl-toggle-count">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      <div className="bl-layout">

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <aside className="bl-sidebar">
            <div className="bl-sidebar-header">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Filters
              </span>
              {activeFilterCount > 0 && (
                <button className="bl-reset-btn" onClick={resetFilters}>Reset all</button>
              )}
            </div>

            {/* Min rating */}
            <div className="bl-filter-group">
              <div className="bl-filter-label">
                Minimum Rating
                {minRating > 0 && <span className="bl-rating-val">★ {minRating}+</span>}
              </div>
              <div className="bl-rating-btns">
                {[0, 3, 3.5, 4, 4.5].map((r) => (
                  <button
                    key={r}
                    className={`bl-sort-btn${minRating === r ? ' active' : ''}`}
                    onClick={() => setMinRating(r)}
                  >
                    {r === 0 ? 'Any rating' : `★ ${r}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="bl-filter-group">
              <div className="bl-filter-label">Sort By</div>
              <div className="bl-sort-options">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`bl-sort-btn${sortBy === opt.value ? ' active' : ''}`}
                    onClick={() => setSortBy(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Business type filter */}
            {availableTypes.length > 1 && (
              <div className="bl-filter-group">
                <div className="bl-filter-label">Business Type</div>
                <div className="bl-type-pills">
                  {availableTypes.map((t) => (
                    <button
                      key={t.value}
                      className={`bl-type-pill${bizType === t.value ? ' active' : ''}`}
                      onClick={() => setBizType(t.value)}
                    >
                      <span className="bl-type-icon">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </aside>
        )}

        {/* ── Grid ── */}
        <div className="bl-grid-area">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏙️</div>
              <h3>No businesses match your filters</h3>
              <p>Try adjusting or <button className="bl-inline-reset" onClick={resetFilters}>resetting filters</button></p>
            </div>
          ) : (
            <div className={`bl-grid${sidebarOpen ? '' : ' bl-grid-wide'}`}>
              {filtered.map((b) => (
                <BusinessCard
                  key={b.id}
                  business={b}
                  rating={ratings[b.id] ?? null}
                  onClick={() => navigate(`/business/${b.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}