import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllServices } from '../api/services';
import { getApprovedBusinesses } from '../api/business';
import { getServiceAverageRating } from '../api/reviews';
import Spinner from '../components/Spinner';
import './AllServices.css';

const ALL_CATEGORIES = ['Salon', 'Spa', 'Fitness', 'Medical', 'Restaurant', 'Cleaning', 'Beauty'];

const CATEGORY_ICONS = {
  salon: '💇', spa: '💆', fitness: '🏋️', medical: '🏥',
  restaurant: '🍽️', cleaning: '🧹', beauty: '💅', default: '⚙️',
};

const SORT_OPTIONS = [
  { value: 'default',     label: 'Default' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating_desc',label: 'Top Rated' },
];

export default function AllServices() {
  const [services, setServices]               = useState([]);
  const [businesses, setBusinesses]           = useState({});
  const [loading, setLoading]                 = useState(true);
  const [serviceRatings, setServiceRatings]   = useState({});
  const navigate = useNavigate();

  // ── Filter state ───────────────────────────────────────────────────────────
  const [search, setSearch]                 = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [activeCategories, setActiveCategories] = useState([]);
  const [citySearch, setCitySearch]         = useState('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [selectedCity, setSelectedCity]     = useState('');
  const [sortBy, setSortBy]                 = useState('default');
  const [priceMax, setPriceMax]             = useState(10000);
  const [dataMaxPrice, setDataMaxPrice]     = useState(10000);
  const [sidebarOpen, setSidebarOpen]       = useState(true);

  const cityRef = useRef(null);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getAllServices(), getApprovedBusinesses()])
      .then(async ([sRes, bRes]) => {
        const svcs = Array.isArray(sRes.data) ? sRes.data : [];
        setServices(svcs);

        const bMap = {};
        (bRes.data || []).forEach((b) => { bMap[b.id] = b; });
        setBusinesses(bMap);

        const top     = Math.max(...svcs.map((s) => Number(s.price) || 0), 0);
        const rounded = Math.ceil(top / 500) * 500 || 10000;
        setDataMaxPrice(rounded);
        setPriceMax(rounded);

        const ratingMap = {};
        await Promise.all(svcs.map(async (s) => {
          try {
            const res = await getServiceAverageRating(s.id);
            ratingMap[s.id] = res.data ? Number(res.data) : null;
          } catch { ratingMap[s.id] = null; }
        }));
        setServiceRatings(ratingMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Close city dropdown on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (cityRef.current && !cityRef.current.contains(e.target)) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derive cities ──────────────────────────────────────────────────────────
  const allCities = useMemo(() => {
    const set = new Set();
    Object.values(businesses).forEach((b) => {
      const city = b.city || b.location;
      if (city) set.add(city);
    });
    return Array.from(set).sort();
  }, [businesses]);

  const filteredCities = useMemo(() =>
    allCities.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase())),
    [allCities, citySearch]
  );

  // ── Category filter with search ────────────────────────────────────────────
  const visibleCategories = useMemo(() =>
    ALL_CATEGORIES.filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase())),
    [categorySearch]
  );

  const toggleCategory = (cat) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = services.filter((s) => {
      const biz = businesses[s.businessId] || {};
      const q   = search.toLowerCase();

      const matchSearch = !q ||
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        biz.name?.toLowerCase().includes(q) ||
        biz.city?.toLowerCase().includes(q);

      const matchCat = activeCategories.length === 0 ||
        activeCategories.some((ac) => biz.category?.toLowerCase() === ac.toLowerCase());

      const matchCity = !selectedCity ||
        biz.city === selectedCity || biz.location === selectedCity;

      const price = Number(s.price) || 0;
      const matchPrice = price <= priceMax;

      return matchSearch && matchCat && matchCity && matchPrice;
    });

    switch (sortBy) {
      case 'price_asc':  list = [...list].sort((a, b) => Number(a.price) - Number(b.price)); break;
      case 'price_desc': list = [...list].sort((a, b) => Number(b.price) - Number(a.price)); break;
      case 'rating_desc':list = [...list].sort((a, b) => (serviceRatings[b.id] ?? -1) - (serviceRatings[a.id] ?? -1)); break;
      default: break;
    }
    return list;
  }, [services, businesses, search, activeCategories, selectedCity, priceMax, sortBy, serviceRatings]);

  const activeFilterCount = [
    activeCategories.length > 0,
    !!selectedCity,
    sortBy !== 'default',
    priceMax < dataMaxPrice,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setActiveCategories([]);
    setSelectedCity('');
    setCitySearch('');
    setSortBy('default');
    setPriceMax(dataMaxPrice);
    setSearch('');
    setCategorySearch('');
  };

  const handleCardClick = (service) => {
    navigate(`/book/${service.businessId}`, {
      state: { business: businesses[service.businessId], preSelectedServiceId: service.id },
    });
  };

  const handleBizClick = (e, businessId) => {
    e.stopPropagation();
    navigate(`/business/${businessId}`);
  };

  if (loading) return <div className="page-container"><Spinner message="Loading services..." /></div>;

  return (
    <div className="page-container as-root">

      {/* ── Top bar ── */}
      <div className="as-topbar">
        <div>
          <h1 className="page-title">All Services</h1>
          <p className="page-subtitle">
            <span className="as-count">{filtered.length}</span> of {services.length} services
            {activeFilterCount > 0 && (
              <button className="as-filter-badge" onClick={resetFilters}>
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} · clear
              </button>
            )}
          </p>
        </div>
        <div className="as-topbar-right">
          <div className="as-search-wrap">
            <span className="as-search-icon">🔍</span>
            <input
              className="as-search-input"
              placeholder="Search services, businesses, cities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="as-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          <button
            className={`as-filter-toggle${sidebarOpen ? ' open' : ''}`}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/>
              <line x1="12" y1="18" x2="20" y2="18"/>
            </svg>
            {sidebarOpen ? 'Hide filters' : 'Show filters'}
            {activeFilterCount > 0 && <span className="as-ft-dot">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      <div className="as-layout">

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <aside className="as-sidebar">

            <div className="as-sb-head">
              <span className="as-sb-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Filters
              </span>
              {activeFilterCount > 0 && (
                <button className="as-sb-reset" onClick={resetFilters}>Reset all</button>
              )}
            </div>

            {/* ── Sort ── */}
            <div className="as-sb-section">
              <div className="as-sb-label">Sort by</div>
              <div className="as-sort-grid">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`as-sort-chip${sortBy === opt.value ? ' active' : ''}`}
                    onClick={() => setSortBy(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Category ── */}
            <div className="as-sb-section">
              <div className="as-sb-label">Category</div>
              <div className="as-cat-search-wrap">
                <span className="as-cat-search-icon">🔍</span>
                <input
                  className="as-cat-search"
                  placeholder="Find category…"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
              </div>
              <div className="as-cat-list">
                {visibleCategories.length === 0 ? (
                  <p className="as-no-match">No category matches</p>
                ) : (
                  visibleCategories.map((cat) => {
                    const active = activeCategories.includes(cat);
                    return (
                      <label key={cat} className={`as-cat-row${active ? ' active' : ''}`}>
                        <span className="as-cat-icon">{CATEGORY_ICONS[cat.toLowerCase()] || '⚙️'}</span>
                        <span className="as-cat-name">{cat}</span>
                        <input
                          type="checkbox"
                          className="as-cat-check"
                          checked={active}
                          onChange={() => toggleCategory(cat)}
                        />
                        <span className={`as-cat-cb${active ? ' checked' : ''}`} />
                      </label>
                    );
                  })
                )}
              </div>
              {activeCategories.length > 0 && (
                <button className="as-cat-clear" onClick={() => setActiveCategories([])}>
                  Clear categories ({activeCategories.length})
                </button>
              )}
            </div>

            {/* ── City ── */}
            <div className="as-sb-section">
              <div className="as-sb-label">City / Location</div>
              <div className="as-city-wrap" ref={cityRef}>
                <div
                  className={`as-city-input-row${cityDropdownOpen ? ' focused' : ''}`}
                  onClick={() => setCityDropdownOpen(true)}
                >
                  <span className="as-city-pin">📍</span>
                  <input
                    className="as-city-input"
                    placeholder={selectedCity || 'Search city…'}
                    value={citySearch}
                    onChange={(e) => { setCitySearch(e.target.value); setCityDropdownOpen(true); }}
                    onFocus={() => setCityDropdownOpen(true)}
                  />
                  {selectedCity && (
                    <button className="as-city-clear" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCity('');
                      setCitySearch('');
                    }}>✕</button>
                  )}
                </div>

                {cityDropdownOpen && (
                  <div className="as-city-dropdown">
                    {filteredCities.length === 0 ? (
                      <div className="as-city-none">No cities found</div>
                    ) : (
                      filteredCities.map((city) => (
                        <button
                          key={city}
                          className={`as-city-option${selectedCity === city ? ' selected' : ''}`}
                          onClick={() => {
                            setSelectedCity(city);
                            setCitySearch('');
                            setCityDropdownOpen(false);
                          }}
                        >
                          {selectedCity === city && <span className="as-city-tick">✓</span>}
                          {city}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Price range ── */}
            <div className="as-sb-section">
              <div className="as-sb-label">
                Max Price
                <span className="as-price-val">up to ₹{priceMax.toLocaleString()}</span>
              </div>
              <div className="as-price-slider-wrap">
                <input
                  type="range"
                  min={0}
                  max={dataMaxPrice}
                  step={100}
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  className="as-price-slider"
                  style={{ '--pct': `${(priceMax / dataMaxPrice) * 100}%` }}
                />
                <div className="as-price-ends">
                  <span>₹0</span>
                  <span>₹{dataMaxPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </aside>
        )}

        {/* ── Cards grid ── */}
        <div className="as-grid-area">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No services match</h3>
              <p>Try adjusting your filters or <button className="as-inline-reset" onClick={resetFilters}>reset all</button></p>
            </div>
          ) : (
            <div className={`as-grid${sidebarOpen ? '' : ' as-grid-wide'}`}>
              {filtered.map((service) => {
                const biz    = businesses[service.businessId] || {};
                const rating = serviceRatings[service.id];
                const icon   = CATEGORY_ICONS[biz.category?.toLowerCase()] || CATEGORY_ICONS.default;
                const dur    = service.duration || service.durationMinutes;
                return (
                  <div
                    key={service.id}
                    className="as-card"
                    onClick={() => handleCardClick(service)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleCardClick(service)}
                  >
                    <div className="as-card-header">
                      <span className="as-card-icon">{icon}</span>
                      {rating !== null && rating !== undefined && (
                        <span className="as-card-star">★ {Number(rating).toFixed(1)}</span>
                      )}
                    </div>
                    <div className="as-card-body">
                      <h3 className="as-card-name">{service.name}</h3>
                      {service.description && (
                        <p className="as-card-desc">{service.description}</p>
                      )}
                      {biz.name && (
                        <div
                          className="as-card-biz"
                          onClick={(e) => handleBizClick(e, service.businessId)}
                          role="link"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleBizClick(e, service.businessId); }}
                          title="View business details"
                        >
                          <span className="as-card-biz-name">🏪 {biz.name}</span>
                          {biz.city && <span className="as-card-biz-city">{biz.city}</span>}
                          {/* Hint pill — makes the clickability obvious */}
                          <span className="as-card-biz-hint">View details ↗</span>
                        </div>
                      )}
                      <div className="as-card-footer">
                        <span className="as-card-price">₹{service.price}</span>
                        {dur && <span className="as-card-dur">⏱ {dur} min</span>}
                      </div>
                      <div className="as-card-book-row">
                        <span className="as-card-book-label">Book Now →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}