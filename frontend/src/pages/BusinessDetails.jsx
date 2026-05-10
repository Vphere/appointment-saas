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

export default function BusinessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness]         = useState(null);
  const [services, setServices]         = useState([]);
  const [rating, setRating]             = useState(null);
  const [reviews, setReviews]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Service selection (drives Book CTA only)
  const [selectedService, setSelectedService] = useState(null);

  // Photos: keyed by serviceId → array of photo objects
  const [photoMap, setPhotoMap]           = useState({});
  const [photosLoading, setPhotosLoading] = useState(false);

  // Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // ── Fetch everything ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchAll = async () => {
      setLoading(true);
      setError('');

      // 1) Business
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

      // 2) Services
      let fetchedServices = [];
      try {
        const sRes = await getServicesByBusiness(id);
        fetchedServices = Array.isArray(sRes.data) ? sRes.data : [];
        if (isMounted) setServices(fetchedServices);
      } catch {
        if (isMounted) setServices([]);
      }

      // 3) Rating
      try {
        const rRes = await getAverageRating(id);
        if (isMounted) setRating(rRes.data);
      } catch { if (isMounted) setRating(null); }

      // 4) Reviews
      try {
        const revRes = await getBusinessReviews(id);
        if (isMounted) setReviews(Array.isArray(revRes.data) ? revRes.data : []);
      } catch { if (isMounted) setReviews([]); }

      if (isMounted) setLoading(false);

      // 5) Photos — parallel fetch for every service
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

  // ── Flatten all photos with their service name attached ───────────────────
  const allPhotos = Object.entries(photoMap).flatMap(([svcId, photos]) => {
    const svc = services.find((s) => String(s.id) === String(svcId));
    return photos.map((p) => ({ ...p, serviceName: svc?.name || '' }));
  });

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="page-container"><Spinner message="Loading business details..." /></div>;
  }

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
          className="btn btn-primary btn-lg"
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {services.map((s) => (
              <div
                key={s.id}
                className={`service-card service-card-selectable${selectedService?.id === s.id ? ' selected' : ''}`}
                onClick={() => setSelectedService(selectedService?.id === s.id ? null : s)}
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
            ))}
          </div>
        )}

        {selectedService && (
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              onClick={() =>
                navigate(`/book/${id}`, { state: { business, services, preSelectedServiceId: selectedService.id } })
              }
            >
              📅 Book — {selectedService.name} (₹{selectedService.price})
            </button>
          </div>
        )}
      </div>

      {/* ── Photos ── */}
      <div className="section">
        <h2 className="section-title">Photos</h2>

        {photosLoading ? (
          <div className="photo-section-loading">
            <span className="photo-spinner" /> Loading photos…
          </div>
        ) : allPhotos.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <div className="empty-icon">📷</div>
            <h3>No photos yet</h3>
            <p>Photos will appear here once added by the business.</p>
          </div>
        ) : (
          <div className="photo-grid">
            {allPhotos.map((photo) => {
              const src = resolvePhotoUrl(photo.url);
              return (
                <button
                  key={photo.id}
                  className="photo-thumb-btn"
                  onClick={() => setLightboxPhoto({ ...photo, resolvedUrl: src })}
                  title={photo.caption || photo.serviceName || 'View photo'}
                >
                  <img
                    src={src}
                    alt={photo.caption || photo.serviceName || 'Service photo'}
                    className="photo-thumb"
                    onError={(e) => { e.currentTarget.closest('.photo-thumb-btn').style.display = 'none'; }}
                  />
                  <div className="photo-caption-bar">
                    {photo.caption    && <span className="photo-caption-text">{photo.caption}</span>}
                    {photo.serviceName && <span className="photo-service-tag">{photo.serviceName}</span>}
                  </div>
                </button>
              );
            })}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map((r) => (
              <div key={r.id} className="review-card">
                <div className="review-header">
                  <span className="reviewer-name">{r.customerName || r.userName || r.userEmail || 'Anonymous'}</span>
                  <StarRating value={r.rating} readonly size="1rem" />
                </div>
                {r.appointmentDate && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    📅 Visited on {new Date(r.appointmentDate).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </div>
                )}
                {r.comment && <p className="review-comment">{r.comment}</p>}
              </div>
            ))}
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