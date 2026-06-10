import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBusinessById, getApprovedBusinesses } from '../api/business';
import { getServicesByBusiness } from '../api/services';
import { getAverageRating, getBusinessReviews } from '../api/reviews';
import { getPhotos } from '../api/photos';
import { StarRating, RatingDisplay } from '../components/StarRating';
import Spinner from '../components/Spinner';
import './BusinessDetails.css';

const BASE_URL = 'http://localhost:8080';

function resolvePhotoUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// ── Business type label map ───────────────────────────────────────
const BUSINESS_TYPE_LABELS = {
  SOLE_PROPRIETOR: 'Sole Proprietor',
  PARTNERSHIP:     'Partnership',
  PRIVATE_LIMITED: 'Private Limited',
  LLP:             'LLP',
  OTHER:           'Other',
};

// ── Category icon map ─────────────────────────────────────────────
const CATEGORY_ICONS = {
  HEALTH_WELLNESS:    '🏥',
  DENTAL:             '🦷',
  FITNESS_GYM:        '🏋️',
  SALON_BEAUTY:       '💇',
  SPA_MASSAGE:        '💆',
  LEGAL:              '⚖️',
  FINANCIAL:          '💹',
  CONSULTING:         '💼',
  EDUCATION_TUTORING: '📚',
  CLEANING:           '🧹',
  PLUMBING:           '🔧',
  ELECTRICAL:         '⚡',
  CARPENTRY:          '🪚',
  PEST_CONTROL:       '🐜',
  PHOTOGRAPHY:        '📷',
  CATERING:           '🍽️',
  EVENTS:             '🎉',
  TRAVEL:             '✈️',
  GROCERY:            '🛒',
  PHARMACY:           '💊',
  OTHER:              '⚙️',
};

const CATEGORY_LABELS = {
  HEALTH_WELLNESS:    'Health & Wellness',
  DENTAL:             'Dental',
  FITNESS_GYM:        'Fitness & Gym',
  SALON_BEAUTY:       'Salon & Beauty',
  SPA_MASSAGE:        'Spa & Massage',
  LEGAL:              'Legal',
  FINANCIAL:          'Financial',
  CONSULTING:         'Consulting',
  EDUCATION_TUTORING: 'Education & Tutoring',
  CLEANING:           'Cleaning',
  PLUMBING:           'Plumbing',
  ELECTRICAL:         'Electrical',
  CARPENTRY:          'Carpentry',
  PEST_CONTROL:       'Pest Control',
  PHOTOGRAPHY:        'Photography',
  CATERING:           'Catering',
  EVENTS:             'Events',
  TRAVEL:             'Travel',
  GROCERY:            'Grocery',
  PHARMACY:           'Pharmacy',
  OTHER:              'Other',
};

// ── Service type helpers ──────────────────────────────────────────
const SERVICE_TYPE_LABEL = { FIXED: 'Fixed', CONSULTATION: 'Consultation' };
const SERVICE_TYPE_ICON  = { FIXED: '⏱', CONSULTATION: '💬' };

// ── Photo carousel ────────────────────────────────────────────────
function PhotoCarousel({ photos, serviceName, onOpenLightbox }) {
  const [index, setIndex] = useState(0);
  if (!photos || photos.length === 0) return null;

  const current = photos[index];
  const src     = resolvePhotoUrl(current.url);

  return (
    <div className="bd-carousel">
      <div className="bd-carousel-img-wrap">
        <img
          src={src}
          alt={current.caption || serviceName}
          className="bd-carousel-img"
          onClick={() => onOpenLightbox({ ...current, resolvedUrl: src, serviceName })}
          onError={(e) => { e.currentTarget.closest('.bd-carousel').style.display = 'none'; }}
        />
        <button
          className={`bd-carousel-arrow bd-carousel-arrow-left${index === 0 ? ' bd-arrow-hidden' : ''}`}
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
        >‹</button>
        <button
          className={`bd-carousel-arrow bd-carousel-arrow-right${index === photos.length - 1 ? ' bd-arrow-hidden' : ''}`}
          onClick={() => setIndex(i => Math.min(photos.length - 1, i + 1))}
          disabled={index === photos.length - 1}
        >›</button>
        {photos.length > 1 && (
          <div className="bd-carousel-counter">{index + 1} / {photos.length}</div>
        )}
      </div>
      {current.caption && <div className="bd-carousel-caption">{current.caption}</div>}
      {photos.length > 1 && (
        <div className="bd-carousel-dots">
          {photos.map((_, i) => (
            <button
              key={i}
              className={`bd-carousel-dot${i === index ? ' active' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Review card ───────────────────────────────────────────────────
function ReviewCard({ review: r }) {
  if (r.removedByAdmin) return null;

  const bookedLabel = r.appointmentDate
    ? `Used on ${new Date(r.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : 'Verified booking';

  const displayName = r.customerName || r.userEmail || 'Anonymous';
  const initials = displayName.trim().split(/\s+/).map(w => w[0]?.toUpperCase()).slice(0, 2).join('');

  return (
    <div className="bd-review-card">
      <div className="bd-review-top">
        <div className="bd-review-avatar">{initials}</div>
        <div className="bd-review-meta">
          <span className="bd-review-name">{displayName}</span>
          <span className="bd-review-verified">✅ {bookedLabel}</span>
        </div>
        <div className="bd-review-stars">
          <StarRating value={r.rating} readonly size="0.88rem" />
        </div>
      </div>
      {r.comment && (
        <div className="bd-review-body">
          <span className="bd-review-quote" aria-hidden="true">❝</span>
          <p className="bd-review-comment">{r.comment}</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function BusinessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness]   = useState(null);
  const [services, setServices]   = useState([]);
  const [rating, setRating]       = useState(null);
  const [reviews, setReviews]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [photoMap, setPhotoMap]   = useState({});
  const [photosLoading, setPhotosLoading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchAll = async () => {
      setLoading(true); setError('');
      let biz = null;
      try {
        const res = await getBusinessById(id); biz = res.data;
      } catch {
        try {
          const listRes = await getApprovedBusinesses();
          biz = listRes.data?.find(b => String(b.id) === String(id)) || null;
        } catch { biz = null; }
      }
      if (!isMounted) return;
      if (!biz) { setError('Business not found'); setLoading(false); return; }
      setBusiness(biz);

      let fetchedServices = [];
      try {
        const sRes = await getServicesByBusiness(id);
        fetchedServices = Array.isArray(sRes.data) ? sRes.data : [];
        if (isMounted) setServices(fetchedServices);
      } catch { if (isMounted) setServices([]); }

      try {
        const rRes = await getAverageRating(id);
        if (isMounted) setRating(rRes.data);
      } catch { if (isMounted) setRating(null); }

      try {
        const revRes = await getBusinessReviews(id);
        if (isMounted) setReviews(Array.isArray(revRes.data) ? revRes.data.filter(r => !r.removedByAdmin) : []);
      } catch { if (isMounted) setReviews([]); }

      if (isMounted) setLoading(false);

      if (fetchedServices.length > 0) {
        if (isMounted) setPhotosLoading(true);
        const results = await Promise.allSettled(
          fetchedServices.map(s =>
            getPhotos(s.id).then(res => ({ serviceId: s.id, photos: Array.isArray(res.data) ? res.data : [] }))
          )
        );
        if (isMounted) {
          const map = {};
          results.forEach(r => { if (r.status === 'fulfilled') map[r.value.serviceId] = r.value.photos; });
          setPhotoMap(map);
          setPhotosLoading(false);
        }
      }
    };

    fetchAll();
    return () => { isMounted = false; };
  }, [id]);

  const handleKeyDown = useCallback(e => { if (e.key === 'Escape') setLightboxPhoto(null); }, []);
  useEffect(() => {
    if (lightboxPhoto) { document.addEventListener('keydown', handleKeyDown); document.body.style.overflow = 'hidden'; }
    else { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; }
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; };
  }, [lightboxPhoto, handleKeyDown]);

  if (loading) return <div className="page-container"><Spinner message="Loading business details..." /></div>;
  if (error || !business) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">❌</div>
          <h3>{error || 'Business not found'}</h3>
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/businesses')}>
            ← Back to Businesses
          </button>
        </div>
      </div>
    );
  }

  const reviewsByService = reviews.reduce((acc, r) => {
    const key = r.serviceId ? String(r.serviceId) : '__general__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const servicesWithPhotos  = services.filter(s => (photoMap[s.id] || []).length > 0);
  const servicesWithReviews = services.filter(s => (reviewsByService[String(s.id)] || []).length > 0);
  const generalReviews      = reviewsByService['__general__'] || [];
  const visibleReviews      = reviews.filter(r => !r.removedByAdmin);

  // Derive a primary category from services
  const primaryCategory = services[0]?.category || null;
  const catIcon  = CATEGORY_ICONS[primaryCategory]  || '🏪';
  const catLabel = CATEGORY_LABELS[primaryCategory] || (business.businessType ? BUSINESS_TYPE_LABELS[business.businessType] : '');

  const joinedDate = business.createdAt
    ? new Date(business.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="bd-root">

      {/* ── Hero Banner ── */}
      <div className="bd-hero">
        <div className="bd-hero-inner">
          <div className="bd-hero-eyebrow">🏪 BUSINESS PROFILE</div>
          <h1 className="bd-hero-title">{business.name}</h1>
          {business.description && (
            <p className="bd-hero-desc">{business.description}</p>
          )}

          {/* Meta pills */}
          <div className="bd-hero-meta">
            {business.phone && (
              <div className="bd-hero-pill">
                <span>📞</span>
                <span className="bd-hero-pill-label">Phone</span>
                <span className="bd-hero-pill-value">{business.phone}</span>
              </div>
            )}
            {catLabel && (
              <div className="bd-hero-pill">
                <span>{catIcon}</span>
                <span className="bd-hero-pill-label">Category</span>
                <span className="bd-hero-pill-value">{catLabel}</span>
              </div>
            )}
            {business.businessType && (
              <div className="bd-hero-pill">
                <span>🏢</span>
                <span className="bd-hero-pill-label">Type</span>
                <span className="bd-hero-pill-value">{BUSINESS_TYPE_LABELS[business.businessType] || business.businessType}</span>
              </div>
            )}
            {joinedDate && (
              <div className="bd-hero-pill">
                <span>📅</span>
                <span className="bd-hero-pill-label">On BookEase since</span>
                <span className="bd-hero-pill-value">{joinedDate}</span>
              </div>
            )}
          </div>

          {/* Rating + CTA row */}
          <div className="bd-hero-bottom">
            <div className="bd-hero-rating">
              <RatingDisplay rating={rating} count={visibleReviews.length} />
            </div>
            <button
              className="bd-book-cta"
              onClick={() => navigate(`/book/${id}`, { state: { business, services } })}
            >
              📅 Book Appointment
            </button>
          </div>
        </div>
      </div>

      {/* ── Services ── */}
      <div className="bd-section">
        <div className="bd-section-header">
          <div className="bd-section-eyebrow">⚡ SERVICES OFFERED</div>
          <h2 className="bd-section-title">What We Offer</h2>
          <p className="bd-section-sub">Select a service to book it directly</p>
        </div>

        {services.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <div className="empty-icon">⚙️</div>
            <h3>No services listed yet</h3>
          </div>
        ) : (
          <>
            <div className="bd-services-grid">
              {services.map(s => {
                const isSelected = selectedService?.id === s.id;
                const svcCatIcon  = CATEGORY_ICONS[s.category]  || '⚙️';
                const svcCatLabel = CATEGORY_LABELS[s.category] || s.category || '';

                return (
                  <div
                    key={s.id}
                    className={`bd-service-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedService(isSelected ? null : s)}
                  >
                    {/* Card header */}
                    <div className="bd-svc-header">
                      <div className="bd-svc-name">{s.name}</div>
                      <div className="bd-svc-price">₹{s.price}</div>
                    </div>

                    {/* Detail chips */}
                    <div className="bd-svc-chips">
                      <div className="bd-svc-chip">
                        <span>{SERVICE_TYPE_ICON[s.serviceType] || '⚙️'}</span>
                        <span className="bd-svc-chip-label">Type</span>
                        <span className="bd-svc-chip-val">{SERVICE_TYPE_LABEL[s.serviceType] || s.serviceType}</span>
                      </div>
                      {s.duration > 0 && (
                        <div className="bd-svc-chip">
                          <span>⏱</span>
                          <span className="bd-svc-chip-label">Duration</span>
                          <span className="bd-svc-chip-val">{s.duration} min</span>
                        </div>
                      )}
                      {svcCatLabel && (
                        <div className="bd-svc-chip">
                          <span>{svcCatIcon}</span>
                          <span className="bd-svc-chip-label">Category</span>
                          <span className="bd-svc-chip-val">{svcCatLabel}</span>
                        </div>
                      )}
                      {(s.city || s.state) && (
                        <div className="bd-svc-chip">
                          <span>📍</span>
                          <span className="bd-svc-chip-label">Location</span>
                          <span className="bd-svc-chip-val">{[s.city, s.state].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {s.description && (
                      <p className="bd-svc-desc">
                        <span className="bd-svc-desc-label">About · </span>{s.description}
                      </p>
                    )}

                    {/* Expandable book row */}
                    <div className={`bd-svc-book-row ${isSelected ? 'visible' : ''}`}>
                      <button
                        className="bd-book-cta bd-book-cta--service"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/book/${id}`, { state: { business, services, preSelectedServiceId: s.id } });
                        }}
                      >
                        📅 Book — {s.name}
                        <span className="bd-book-cta-price"> (₹{s.price})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {!selectedService && (
              <p className="bd-select-hint">👆 Tap a service to book it</p>
            )}
          </>
        )}
      </div>

      {/* ── Photos ── */}
      <div className="bd-section">
        <div className="bd-section-header">
          <div className="bd-section-eyebrow">📷 GALLERY</div>
          <h2 className="bd-section-title">Photos</h2>
        </div>

        {photosLoading ? (
          <div className="bd-photos-loading">
            <span className="photo-spinner" /> Loading photos…
          </div>
        ) : servicesWithPhotos.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <div className="empty-icon">📷</div>
            <h3>No photos yet</h3>
            <p>Photos will appear here once added by the business.</p>
          </div>
        ) : (
          <div className="bd-photo-groups">
            {servicesWithPhotos.map(svc => (
              <div key={svc.id} className="bd-photo-group">
                {/* Service label bar */}
                <div className="bd-photo-group-label">
                  <div className="bd-photo-group-icon">
                    {CATEGORY_ICONS[svc.category] || '📷'}
                  </div>
                  <div className="bd-photo-group-info">
                    <span className="bd-photo-group-name">{svc.name}</span>
                    <span className="bd-photo-group-meta">
                      {svc.duration > 0 && `⏱ ${svc.duration} min · `}₹{svc.price}
                    </span>
                  </div>
                  <span className="bd-photo-group-count">
                    {(photoMap[svc.id] || []).length} photo{(photoMap[svc.id] || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <PhotoCarousel
                  photos={photoMap[svc.id] || []}
                  serviceName={svc.name}
                  onOpenLightbox={setLightboxPhoto}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reviews ── */}
      <div className="bd-section">
        <div className="bd-section-header">
          <div className="bd-section-eyebrow">💬 CUSTOMER REVIEWS</div>
          <h2 className="bd-section-title">
            What Customers Say
            {visibleReviews.length > 0 && (
              <span className="bd-reviews-count">{visibleReviews.length} review{visibleReviews.length !== 1 ? 's' : ''}</span>
            )}
          </h2>
          {rating && (
            <div className="bd-overall-rating">
              <RatingDisplay rating={rating} count={visibleReviews.length} />
              <span className="bd-rating-label">Overall rating</span>
            </div>
          )}
        </div>

        {visibleReviews.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <div className="empty-icon">💬</div>
            <h3>No reviews yet</h3>
            <p>Be the first to review after booking!</p>
          </div>
        ) : (
          <div className="bd-review-groups">
            {servicesWithReviews.map(svc => (
              <div key={svc.id} className="bd-review-group">
                <div className="bd-review-group-label">
                  <span className="bd-review-group-icon">{CATEGORY_ICONS[svc.category] || '⚙️'}</span>
                  <span className="bd-review-group-name">{svc.name}</span>
                  <span className="bd-review-group-count">
                    {(reviewsByService[String(svc.id)] || []).length} review{(reviewsByService[String(svc.id)] || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="bd-review-list">
                  {(reviewsByService[String(svc.id)] || []).map(r => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              </div>
            ))}

            {generalReviews.length > 0 && (
              <div className="bd-review-group">
                {servicesWithReviews.length > 0 && (
                  <div className="bd-review-group-label">
                    <span className="bd-review-group-icon">⭐</span>
                    <span className="bd-review-group-name">General Reviews</span>
                    <span className="bd-review-group-count">{generalReviews.length}</span>
                  </div>
                )}
                <div className="bd-review-list">
                  {generalReviews.map(r => <ReviewCard key={r.id} review={r} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxPhoto && (
        <div
          className="bd-lightbox-overlay"
          onClick={() => setLightboxPhoto(null)}
          role="dialog" aria-modal="true"
        >
          <div className="bd-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="bd-lightbox-close" onClick={() => setLightboxPhoto(null)}>✕</button>
            <img src={lightboxPhoto.resolvedUrl} alt={lightboxPhoto.caption || 'Photo'} className="bd-lightbox-img" />
            <div className="bd-lightbox-meta">
              {lightboxPhoto.caption     && <span className="bd-lightbox-caption">{lightboxPhoto.caption}</span>}
              {lightboxPhoto.serviceName && <span className="bd-lightbox-service">{lightboxPhoto.serviceName}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}