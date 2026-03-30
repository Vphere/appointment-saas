import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllServices } from '../api/services';
import { getApprovedBusinesses } from '../api/business';
import Spinner from '../components/Spinner';
import './AllServices.css';

export default function AllServices() {
  const [services, setServices] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getAllServices(), getApprovedBusinesses()])
      .then(([sRes, bRes]) => {
        setServices(Array.isArray(sRes.data) ? sRes.data : []);
        // Build a map for quick business name lookup
        const bMap = {};
        (bRes.data || []).forEach((b) => { bMap[b.id] = b; });
        setBusinesses(bMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = services.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      businesses[s.businessId]?.name?.toLowerCase().includes(q) ||
      businesses[s.businessId]?.city?.toLowerCase().includes(q)
    );
  });

  const handleBook = (service) => {
    const business = businesses[service.businessId];
    if (business) {
      navigate(`/book/${service.businessId}`, {
        state: {
          business,
          preSelectedServiceId: service.id,
        },
      });
    } else {
      navigate(`/book/${service.businessId}`, {
        state: { preSelectedServiceId: service.id },
      });
    }
  };

  if (loading) return <div className="page-container"><Spinner message="Loading services..." /></div>;

  return (
    <div className="page-container">
      <div className="page-header flex-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="page-title">All Services</h1>
          <p className="page-subtitle">{services.length} services available across all businesses</p>
        </div>
        <input
          className="form-input"
          style={{ maxWidth: 280 }}
          placeholder="🔍 Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No services found</h3>
          <p>Try a different search</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {filtered.map((service) => {
            const biz = businesses[service.businessId] || {};
            return (
              <div key={service.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Icon strip */}
                <div style={{
                  height: 80,
                  background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(67,233,123,0.1))',
                  borderRadius: '8px 8px 0 0',
                  margin: '-24px -24px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                }}>
                  ⚙️
                </div>

                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{service.name}</h3>
                {service.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 10, flex: 1 }}>
                    {service.description}
                  </p>
                )}

                {/* Business info */}
                {biz.name && (
                  <div
                    style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, cursor: 'pointer' }}
                    onClick={() => navigate(`/business/${service.businessId}`)}
                  >
                    🏪 {biz.name} {biz.city && `· ${biz.city}`}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ color: 'var(--primary-light)', fontWeight: 700, fontSize: '1.1rem' }}>
                    ₹{service.price}
                  </span>
                  {(service.duration || service.durationMinutes) && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      ⏱ {service.duration || service.durationMinutes} min
                    </span>
                  )}
                </div>

                <button
                  className="btn btn-primary btn-full"
                  onClick={() => handleBook(service)}
                >
                  📅 Book Now
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
