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

// ── Per-service photo carousel ────────────────────────────────────────────────
function PhotoCarousel({ photos, serviceName, onOpenLightbox }) {
  const [index, setIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  const current = photos[index];
  const src     = resolvePhotoUrl(current.url);
  const isFirst = index === 0;
  const isLast  = index === photos.length - 1;

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

        {/* Prev arrow — hidden when on first */}
        <button
          className={`bd-carousel-arrow bd-carousel-arrow-left${isFirst ? ' bd-arrow-hidden' : ''}`}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous photo"
          disabled={isFirst}
        >
          ‹
        </button>

        {/* Next arrow — hidden when on last */}
        <button
          className={`bd-carousel-arrow bd-carousel-arrow-right${isLast ? ' bd-arrow-hidden' : ''}`}
          onClick={() => setIndex((i) => Math.min(photos.length - 1, i + 1))}
          aria-label="Next photo"
          disabled={isLast}
        >
          ›
        </button>

        {/* Counter pill */}
        {photos.length > 1 && (
          <div className="bd-carousel-counter">{index + 1} / {photos.length}</div>
        )}
      </div>

      {current.caption && (
        <div className="bd-carousel-caption">{current.caption}</div>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="bd-carousel-dots">
          {photos.map((_, i) => (
            <button
              key={i}
              className={`bd-carousel-dot${i === index ? ' active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Review card ────────────────────────────────────────────────────────────────
function ReviewCard({ review: r }) {
  const bookedLabel = r.appointmentDate
    ? `Used this service on ${new Date(r.appointmentDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })}`
    : 'Verified booking';

  const displayName = r.customerName || r.userName || r.userEmail || 'Anonymous';
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <div className="bd-review-card">
      {/* Top row: avatar · name · verified · stars */}
      <div className="bd-review-top">
        <div className="bd-review-avatar" aria-hidden="true">{initials}</div>
        <div className="bd-review-meta">
          <span className="bd-review-name">{displayName}</span>
          <span className="bd-review-verified">✅ {bookedLabel}</span>
        </div>
        <div className="bd-review-stars">
          <StarRating value={r.rating} readonly size="0.88rem" />
        </div>
      </div>

      {/* Review text */}
      {r.comment && (
        <div className="bd-review-body">
          <span className="bd-review-quote" aria-hidden="true">❝</span>
          <p className="bd-review-comment">{r.comment}</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function BusinessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness]         = useState(null);
  const [services, setServices]         = useState([]);
  const [rating, setRating]             = useState(null);
  const [reviews, setReviews]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const [selectedService, setSelectedService] = useState(null);

  const [photoMap, setPhotoMap]           = useState({});
  const [photosLoading, setPhotosLoading] = useState(false);

  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchAll = async () => {
      setLoading(true);
      setError('');

      let biz = null;
      try {
        const res = await getBusinessById(id);
        biz = res.data;
      } catch {
        try {
          const listRes = await getApprovedBusinesses();
          biz = listRes.data?.find((b) => String(b.id) === String(id)) || null;
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
      } catch {
        if (isMounted) setServices([]);
      }

      try {
        const rRes = await getAverageRating(id);
        if (isMounted) setRating(rRes.data);
      } catch { if (isMounted) setRating(null); }

      try {
        const revRes = await getBusinessReviews(id);
        if (isMounted) setReviews(Array.isArray(revRes.data) ? revRes.data : []);
      } catch { if (isMounted) setReviews([]); }

      if (isMounted) setLoading(false);

      if (fetchedServices.length > 0) {
        if (isMounted) setPhotosLoading(true);
        const results = await Promise.allSettled(
          fetchedServices.map((s) =>
            getPhotos(s.id).then((res) => ({
              serviceId: s.id,
              photos: Array.isArray(res.data) ? res.data : [],
            }))
          )
        );
        if (isMounted) {
          const map = {};
          results.forEach((r) => {
            if (r.status === 'fulfilled') map[r.value.serviceId] = r.value.photos;
          });
          setPhotoMap(map);
          setPhotosLoading(false);
        }
      }
    };

    fetchAll();
    return () => { isMounted = false; };
  }, [id]);

  // ── Lightbox keyboard close ────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setLightboxPhoto(null);
  }, []);

  useEffect(() => {
    if (lightboxPhoto) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxPhoto, handleKeyDown]);

  // ── Guards ─────────────────────────────────────────────────────────────────
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

  const categoryIcons = {
    salon: '💇', spa: '💆', fitness: '🏋️', medical: '🏥',
    restaurant: '🍽️', cleaning: '🧹', beauty: '💅', default: '🏪',
  };
  const icon = categoryIcons[business.category?.toLowerCase()] || categoryIcons.default;

  // Group reviews by serviceId
  const reviewsByService = reviews.reduce((acc, r) => {
    const key = r.serviceId ? String(r.serviceId) : '__general__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const servicesWithPhotos  = services.filter((s) => (photoMap[s.id] || []).length > 0);
  const servicesWithReviews = services.filter((s) => (reviewsByService[String(s.id)] || []).length > 0);
  const generalReviews      = reviewsByService['__general__'] || [];

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>

      {/* ── Hero ── */}
      <div className="dashboard-hero" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>{icon}</div>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 8 }}>{business.name}</h1>
        {business.description && (
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{business.description}</p>
        )}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
          {(business.city || business.location) && <span className="text-muted">📍 {business.city || business.location}</span>}
          {business.phone    && <span className="text-muted">📞 {business.phone}</span>}
          {business.category && <span className="text-muted">🏷 {business.category}</span>}
          <RatingDisplay rating={rating} count={reviews.length} />
        </div>
        <button
          className="btn btn-book btn-lg"
          onClick={() => navigate(`/book/${id}`, { state: { business, services } })}
        >
          📅 Book Appointment
        </button>
      </div>

      {/* ── Services ── */}
      <div className="section">
        <h2 className="section-title">Services Offered</h2>
        {services.length === 0 ? (
          <div className="alert alert-info">No services listed yet for this business.</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {services.map((s) => {
                const isSelected = selectedService?.id === s.id;
                return (
                  <div key={s.id} className="bd-service-block">
                    {/* Service row */}
                    <div
                      className={`service-card service-card-selectable${isSelected ? ' selected' : ''}`}
                      onClick={() => setSelectedService(isSelected ? null : s)}
                    >
                      <div>
                        <div className="service-name">{s.name}</div>
                        {s.description && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.description}</div>
                        )}
                      </div>
                      <div className="service-meta">
                        {(s.duration || s.durationMinutes) && <span>⏱ {s.duration || s.durationMinutes} min</span>}
                        <span className="service-price">₹{s.price}</span>
                      </div>
                    </div>

                    {/* Book button — slides in when this service is selected */}
                    <div className={`bd-service-book-row${isSelected ? ' visible' : ''}`}>
                      <button
                        className="btn btn-book bd-service-book-btn"
                        onClick={() =>
                          navigate(`/book/${id}`, {
                            state: { business, services, preSelectedServiceId: s.id },
                          })
                        }
                      >
                        📅 Book — {s.name}
                        <span className="bd-book-price"> (₹{s.price})</span>
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
      <div className="section">
        <h2 className="section-title">Photos</h2>

        {photosLoading ? (
          <div className="photo-section-loading">
            <span className="photo-spinner" /> Loading photos…
          </div>
        ) : servicesWithPhotos.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <div className="empty-icon">📷</div>
            <h3>No photos yet</h3>
            <p>Photos will appear here once added by the business.</p>
          </div>
        ) : (
          <div className="bd-photo-sections">
            {servicesWithPhotos.map((svc) => (
              <div key={svc.id} className="bd-photo-service-group">
                <div className="bd-section-service-label">
                  <span className="bd-section-service-name">{svc.name}</span>
                  <span className="bd-section-service-meta">
                    {(svc.duration || svc.durationMinutes) && `⏱ ${svc.duration || svc.durationMinutes} min · `}
                    ₹{svc.price}
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
      <div className="section">
        <h2 className="section-title">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <div className="empty-icon">💬</div>
            <h3>No reviews yet</h3>
            <p>Be the first to review!</p>
          </div>
        ) : (
          <div className="bd-review-sections">
            {servicesWithReviews.map((svc) => (
              <div key={svc.id} className="bd-review-service-group">
                <div className="bd-section-service-label">
                  <span className="bd-section-service-name">{svc.name}</span>
                  <span className="bd-section-service-meta">
                    {(reviewsByService[String(svc.id)] || []).length} review
                    {(reviewsByService[String(svc.id)] || []).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(reviewsByService[String(svc.id)] || []).map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              </div>
            ))}

            {generalReviews.length > 0 && (
              <div className="bd-review-service-group">
                {servicesWithReviews.length > 0 && (
                  <div className="bd-section-service-label">
                    <span className="bd-section-service-name">General Reviews</span>
                    <span className="bd-section-service-meta">
                      {generalReviews.length} review{generalReviews.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {generalReviews.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxPhoto && (
        <div
          className="photo-lightbox-overlay"
          onClick={() => setLightboxPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
        >
          <div className="photo-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="photo-lightbox-close" onClick={() => setLightboxPhoto(null)} aria-label="Close">✕</button>
            <img
              src={lightboxPhoto.resolvedUrl}
              alt={lightboxPhoto.caption || 'Service photo'}
              className="photo-lightbox-img"
            />
            <div className="photo-lightbox-meta">
              {lightboxPhoto.caption     && <span className="photo-lightbox-caption">{lightboxPhoto.caption}</span>}
              {lightboxPhoto.serviceName && <span className="photo-lightbox-service">{lightboxPhoto.serviceName}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}