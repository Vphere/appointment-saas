import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBusinessById, getApprovedBusinesses } from '../api/business';
import { getServicesByBusiness } from '../api/services';
import { getAverageRating, getBusinessReviews } from '../api/reviews';
import { StarRating, RatingDisplay } from '../components/StarRating';
import Spinner from '../components/Spinner';
import './BusinessDetails.css';

export default function BusinessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [rating, setRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inline booking state
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid business ID');
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError('');

      // 1) Fetch business — try GET /api/business/{id}, fallback to approved list
      let biz = null;
      try {
        const res = await getBusinessById(id);
        biz = res.data;
      } catch {
        // Endpoint may not exist — fallback: find it in the approved list
        try {
          const listRes = await getApprovedBusinesses();
          biz = listRes.data?.find((b) => String(b.id) === String(id)) || null;
        } catch {
          biz = null;
        }
      }

      if (!biz) {
        setError('Business not found');
        setLoading(false);
        return;
      }
      setBusiness(biz);

      // 2) Fetch services — critical for booking
      try {
        const sRes = await getServicesByBusiness(id);
        setServices(Array.isArray(sRes.data) ? sRes.data : []);
      } catch {
        setServices([]);
      }

      // 3) Fetch rating — non-critical, ignore failure
      try {
        const rRes = await getAverageRating(id);
        setRating(rRes.data);
      } catch {
        setRating(null);
      }

      // 4) Fetch reviews — non-critical, ignore failure
      try {
        const revRes = await getBusinessReviews(id);
        setReviews(Array.isArray(revRes.data) ? revRes.data : []);
      } catch {
        setReviews([]);
      }

      setLoading(false);
    };

    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <Spinner message="Loading business details..." />
      </div>
    );
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
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            {business.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
          {(business.city || business.location) && (
            <span className="text-muted">📍 {business.city || business.location}</span>
          )}
          {business.phone && (
            <span className="text-muted">📞 {business.phone}</span>
          )}
          {business.category && (
            <span className="text-muted">🏷 {business.category}</span>
          )}
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
                className="service-card"
                style={{
                  cursor: 'pointer',
                  borderColor: selectedService?.id === s.id ? 'var(--primary)' : undefined,
                  background: selectedService?.id === s.id ? 'var(--primary-glow)' : undefined,
                }}
                onClick={() => setSelectedService(selectedService?.id === s.id ? null : s)}
              >
                <div>
                  <div className="service-name">{s.name}</div>
                  {s.description && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {s.description}
                    </div>
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

        {/* Quick-book CTA after selecting a service */}
        {selectedService && (
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              onClick={() =>
                navigate(`/book/${id}`, {
                  state: { business, services, preSelectedServiceId: selectedService.id },
                })
              }
            >
              📅 Book — {selectedService.name} (₹{selectedService.price})
            </button>
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
                  <span className="reviewer-name">
                    {r.customerName || r.userName || r.userEmail || 'Anonymous'}
                  </span>
                  <StarRating value={r.rating} readonly size="1rem" />
                </div>
                {r.comment && <p className="review-comment">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
