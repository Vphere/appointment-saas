import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllServices } from '../api/services';
import { getApprovedBusinesses } from '../api/business';
import './Dashboard.css';

const OWNER_ACTIONS = [
  { to: '/my-businesses', icon: '🏢', title: 'My Businesses', desc: 'Manage your registered businesses' },
  { to: '/manage-services', icon: '⚙️', title: 'Manage Services', desc: 'Add and update your services' },
  { to: '/working-hours', icon: '🕓', title: 'Working Hours', desc: 'Set your availability schedule' },
  { to: '/owner-appointments', icon: '📋', title: 'Appointments', desc: 'View and manage customer bookings' },
];

const ADMIN_ACTIONS = [
  { to: '/admin', icon: '✅', title: 'Approve Businesses', desc: 'Review and approve pending businesses' },
];

// Customer-specific dashboard with services
function CustomerDashboard() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllServices(), getApprovedBusinesses()])
      .then(([sRes, bRes]) => {
        const allServices = Array.isArray(sRes.data) ? sRes.data : [];
        // Top 6 services
        setServices(allServices.slice(0, 6));
        const bMap = {};
        (bRes.data || []).forEach((b) => { bMap[b.id] = b; });
        setBusinesses(bMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Quick Actions */}
      <div className="grid grid-2" style={{ marginBottom: 36 }}>
        <Link
          to="/all-services"
          className="card card-hover"
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚡</div>
          <h3 style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
            Browse Services
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Search & book any service directly
          </p>
        </Link>
        <Link
          to="/businesses"
          className="card card-hover"
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏪</div>
          <h3 style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
            Browse Businesses
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Explore businesses and their offerings
          </p>
        </Link>
        <Link
          to="/my-appointments"
          className="card card-hover"
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📅</div>
          <h3 style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
            My Appointments
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            View and manage your bookings
          </p>
        </Link>
      </div>

      {/* Popular Services */}
      <div className="section">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ flex: 1, marginBottom: 0 }}>
            🔥 Popular Services
          </h2>
          <Link to="/all-services" style={{ color: 'var(--primary-light)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}>
            View all →
          </Link>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading services...</div>
        ) : services.length === 0 ? (
          <div className="alert alert-info">No services available yet. Check back soon!</div>
        ) : (
          <div className="grid grid-3">
            {services.map((service) => {
              const biz = businesses[service.businessId] || {};
              return (
                <div
                  key={service.id}
                  className="card card-hover"
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    navigate(`/book/${service.businessId}`, {
                      state: { business: biz, preSelectedServiceId: service.id },
                    })
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {service.name}
                    </h3>
                    <span style={{ color: 'var(--primary-light)', fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                      ₹{service.price}
                    </span>
                  </div>
                  {biz.name && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: 6 }}>
                      🏪 {biz.name} {biz.city && `· ${biz.city}`}
                    </p>
                  )}
                  {(service.duration || service.durationMinutes) && (
                    <p className="dashboard-service-meta">⏱ {service.duration || service.durationMinutes} min</p>
                  )}
                  <div className="btn btn-outline btn-full btn-sm" style={{ marginTop: 12, pointerEvents: 'none' }}>
                    Book Now →
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user, role } = useAuth();

  const actions = role === 'BUSINESS_OWNER' ? OWNER_ACTIONS : role === 'SUPER_ADMIN' ? ADMIN_ACTIONS : [];
  const firstName = user?.name?.split(' ')[0] || user?.sub?.split('@')[0] || 'there';

  return (
    <div className="page-container">
      <div className="dashboard-hero">
        <div className="role-chip">
          {role === 'CUSTOMER' ? '👤' : role === 'BUSINESS_OWNER' ? '🏢' : '⚡'}{' '}
          {role?.replace('_', ' ')}
        </div>
        <h1>Welcome back, {firstName}! 👋</h1>
        <p>What would you like to do today?</p>
      </div>

      {role === 'CUSTOMER' ? (
        <CustomerDashboard />
      ) : (
        <div className="grid grid-2">
          {actions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="card card-hover"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{action.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                {action.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{action.desc}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}