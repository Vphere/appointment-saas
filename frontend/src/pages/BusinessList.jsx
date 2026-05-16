import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApprovedBusinesses } from '../api/business';
import { getAverageRating } from '../api/reviews';
import Spinner from '../components/Spinner';
import './BusinessList.css';

const CATEGORIES = ['All', 'Salon', 'Spa', 'Fitness', 'Medical', 'Restaurant', 'Cleaning', 'Beauty'];

const CATEGORY_ICONS = {
  salon: '💇', spa: '💆', fitness: '🏋️', medical: '🏥',
  restaurant: '🍽️', cleaning: '🧹', beauty: '💅', default: '🏪',
};

const SORT_OPTIONS = [
  { value: 'default',      label: 'Default' },
  { value: 'rating_desc',  label: 'Top Rated' },
  { value: 'name_asc',     label: 'Name A → Z' },
  { value: 'name_desc',    label: 'Name Z → A' },
];

function BusinessCard({ business, rating, onClick }) {
  const icon = CATEGORY_ICONS[business.category?.toLowerCase()] || CATEGORY_ICONS.default;

  return (
    <div
      className="bl-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="bl-card-image">
        <span className="bl-card-icon">{icon}</span>
        {rating !== null && (
          <span className="bl-card-rating-badge">★ {Number(rating).toFixed(1)}</span>
        )}
      </div>
      <div className="bl-card-body">
        <h3 className="bl-card-name">{business.name}</h3>
        <p className="bl-card-desc">{business.description || 'Quality services for you'}</p>
        <div className="bl-card-meta">
          <span className="bl-card-city">📍 {business.city || business.location || 'N/A'}</span>
          {business.category && (
            <span className="bl-card-cat">{business.category}</span>
          )}
        </div>
        <button className="btn btn-outline btn-full bl-card-btn">View Details →</button>
      </div>
    </div>
  );
}

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);
  const [ratings, setRatings]       = useState({});
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();

  // ── Filter state ───────────────────────────────────────────────────────────
  const [search, setSearch]               = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [sortBy, setSortBy]               = useState('default');
  const [minRating, setMinRating]         = useState(0);
  const [sidebarOpen, setSidebarOpen]     = useState(true);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    getApprovedBusinesses()
      .then(async (res) => {
        const bizList = Array.isArray(res.data) ? res.data : [];
        setBusinesses(bizList);

        // Fetch all ratings in parallel
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

  // ── Derive cities ──────────────────────────────────────────────────────────
  const cities = useMemo(() => {
    const set = new Set();
    businesses.forEach((b) => {
      const city = b.city || b.location;
      if (city) set.add(city);
    });
    return ['All', ...Array.from(set).sort()];
  }, [businesses]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = businesses.filter((b) => {
      const q = search.toLowerCase();

      const matchSearch =
        !q ||
        b.name?.toLowerCase().includes(q) ||
        b.city?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q);

      const matchCat =
        activeCategory === 'All' ||
        b.category?.toLowerCase() === activeCategory.toLowerCase();

      const matchLoc =
        locationFilter === 'All' ||
        b.city === locationFilter ||
        b.location === locationFilter;

      const bRating = ratings[b.id];
      const matchRating =
        minRating === 0 ||
        (bRating !== null && bRating !== undefined && bRating >= minRating);

      return matchSearch && matchCat && matchLoc && matchRating;
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
  }, [businesses, ratings, search, activeCategory, locationFilter, sortBy, minRating]);

  const activeFilterCount = [
    activeCategory !== 'All',
    locationFilter !== 'All',
    sortBy !== 'default',
    minRating > 0,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setActiveCategory('All');
    setLocationFilter('All');
    setSortBy('default');
    setMinRating(0);
    setSearch('');
  };

  if (loading) return <div className="page-container"><Spinner message="Loading businesses..." /></div>;

  return (
    <div className="page-container bl-root">

      {/* ── Top bar ── */}
      <div className="bl-topbar">
        <div className="bl-topbar-left">
          <h1 className="page-title">Discover Businesses</h1>
          <p className="page-subtitle">
            {filtered.length} of {businesses.length} businesses available
            {activeFilterCount > 0 && <span className="bl-filter-badge">{activeFilterCount} filters active</span>}
          </p>
        </div>
        <div className="bl-topbar-right">
          <input
            className="form-input bl-search"
            placeholder="🔍 Search businesses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className={`bl-sidebar-toggle${sidebarOpen ? ' active' : ''}`}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ⚡ Filters{activeFilterCount > 0 && <span className="bl-toggle-count">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      <div className="bl-layout">

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <aside className="bl-sidebar">
            <div className="bl-sidebar-header">
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <button className="bl-reset-btn" onClick={resetFilters}>Reset all</button>
              )}
            </div>

            {/* Category */}
            <div className="bl-filter-group">
              <div className="bl-filter-label">Category</div>
              <div className="bl-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`bl-pill${activeCategory === cat ? ' active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat !== 'All' && (CATEGORY_ICONS[cat.toLowerCase()] || '🏪') + ' '}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="bl-filter-group">
              <div className="bl-filter-label">City / Location</div>
              <select
                className="form-input bl-select"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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
                    {r === 0 ? 'Any' : `★ ${r}+`}
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