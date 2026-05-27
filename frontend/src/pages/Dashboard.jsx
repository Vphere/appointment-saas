import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth'; 
import { getAllServices } from '../api/services';
import { getApprovedBusinesses } from '../api/business';
import {
  CalendarDays,
  Building2,
  BriefcaseBusiness,
  Clock3,
  BarChart3,
  CalendarCheck,
  Mail,
  Phone,
} from "lucide-react";
import './Dashboard.css';

const OWNER_ACTIONS = [
  { to: '/my-businesses', icon: '🏢', title: 'My Businesses', desc: 'Manage your registered businesses' },
  { to: '/manage-services', icon: '⚙️', title: 'Manage Services', desc: 'Add and update your services' },
  { to: '/business-settings', icon: '🕓', title: 'Set Working Hours, Holidays, Photos', desc: 'Set your availability schedule, add holidays for service and add photos for your services' },
  { to: '/owner-appointments', icon: '📋', title: 'Appointments', desc: 'View and manage customer bookings' },
];

const ADMIN_ACTIONS = [
  {
    to: '/admin',
    icon: '📊',
    title: 'Analytics Dashboard',
    desc: 'Platform overview — users, bookings, businesses',
  },
  {
    to: '/admin/approvals',
    icon: '✅',
    title: 'Approve Businesses',
    desc: 'Review and approve pending registrations',
  },
  {
    to: '/admin/users',
    icon: '👥',
    title: 'User Management',
    desc: 'View, change roles, and remove users',
  },
  {
    to: '/admin/reviews',
    icon: '⭐',
    title: 'Review Moderation',
    desc: 'Browse and delete inappropriate reviews',
  },
];

const OWNER_TIPS = [
  { icon: '🕐', title: 'Set Working Hours', desc: 'Configure your service hours so customers can book slots accurately.', to: '/business-settings' },
  { icon: '📷', title: 'Add Service Photos', desc: 'Businesses with photos get significantly more bookings.', to: '/business-settings' },
  { icon: '📅', title: 'Mark Holiday Closures', desc: 'Avoid missed bookings — block your holidays in Business Settings.', to: '/business-settings' },
  { icon: '⭐', title: 'Monitor Your Business revenue', desc: 'Know business revenue, appointments history and much more...', to: '/business/analytics' },
];

const FAQS = [
  {
    q: 'How do I add a new service to my business?',
    a: 'Go to Manage Services from the dashboard or nav, pick your business, then click "+ Add Service". Fill in the name, price, duration and location, and save.',
  },
  {
    q: 'Can I set different hours for different services?',
    a: 'Yes! BookEase has service-level working hours. Go to Business Settings → Working Hours, select a business and then a service, and configure hours per day.',
  },
  {
    q: "How do I block a holiday so customers can't book?",
    a: 'Navigate to Business Settings → Holidays. Select your business, pick a date, optionally add a reason, and click "Add Holiday". Bookings will be blocked for that date.',
  },
  {
    q: 'Where can I see my revenue and appointment trends?',
    a: 'The Analytics page (top nav → Analytics) shows your monthly revenue, appointment status breakdown, service-wise earnings, and customer reviews.',
  },
  {
    q: 'What happens after I register a new business?',
    a: 'Your business enters a Pending state and is reviewed by our admin team. Once approved, you can add services and start accepting bookings.',
  },
];

// ── Customer dashboard ────────────────────────────────────────────────────────
function CustomerDashboard() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllServices(), getApprovedBusinesses()])
      .then(([sRes, bRes]) => {
        const allServices = Array.isArray(sRes.data) ? sRes.data : [];
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
        <Link to="/all-services" className="card card-hover" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚡</div>
          <h3 style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>Browse Services</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Search &amp; book any service directly</p>
        </Link>
        <Link to="/businesses" className="card card-hover" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏪</div>
          <h3 style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>Browse Businesses</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Explore businesses and their offerings</p>
        </Link>
        <Link to="/my-appointments" className="card card-hover" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📅</div>
          <h3 style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>My Appointments</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>View and manage your bookings</p>
        </Link>
      </div>

      {/* Popular Services */}
      <div className="section">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ flex: 1, marginBottom: 0 }}>🔥 Popular Services</h2>
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
                  onClick={() => navigate(`/book/${service.businessId}`, { state: { business: biz, preSelectedServiceId: service.id } })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{service.name}</h3>
                    <span style={{ color: 'var(--primary-light)', fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>₹{service.price}</span>
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

// ── Owner Tips ─────────────────────────────────────────────────────────────
function OwnerTips() {
  return (
    <div className="section" style={{ marginTop: 40 }}>
      <h2 className="section-title" style={{ marginBottom: 20 }}>💡 Tips to Get the Most Out of BookEase</h2>
      <div className="grid grid-2">
        {OWNER_TIPS.map((tip) => (
          <Link key={tip.title} to={tip.to} className="dashboard-tip-card" style={{ textDecoration: 'none' }}>
            <span className="dashboard-tip-icon">{tip.icon}</span>
            <div>
              <div className="dashboard-tip-title">{tip.title}</div>
              <div className="dashboard-tip-desc">{tip.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── FAQ accordion ──────────────────────────────────────────────────────────
function FaqSection() {
  const [open, setOpen] = useState(null);
  return (
    <div className="section" style={{ marginTop: 40 }}>
      <h2 className="section-title" style={{ marginBottom: 20 }}>❓ Frequently Asked Questions</h2>
      <div className="dashboard-faq">
        {FAQS.map((faq, i) => (
          <div key={i} className={`faq-item${open === i ? ' faq-open' : ''}`}>
            <button className="faq-question" onClick={() => setOpen(open === i ? null : i)}>
              <span>{faq.q}</span>
              <span className="faq-chevron">{open === i ? '▲' : '▼'}</span>
            </button>
            {open === i && <div className="faq-answer">{faq.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard footer strip ─────────────────────────────────────────────────
function DashboardFooter() {
  return (
    <footer className="dashboard-footer">

      {/* TOP CTA */}
      <div className="footer-top-banner">
        <h2>Grow your business with smarter appointment management</h2>
        <p>
          Simplify scheduling, manage services, and deliver better customer
          experiences — all from one platform built for modern businesses.
        </p>
      </div>

      <div className="dashboard-footer-container">

        {/* BRAND */}
        <div className="footer-brand-section">
          <div className="footer-logo-row">
            <div>
              <h2 className="footer-brand-name">📆 BookEase</h2>
              <p className="footer-brand-tagline">Smart appointment booking platform</p>
            </div>
          </div>

          <p className="footer-description">
            Helping small businesses grow and large enterprises manage appointments
            efficiently — all from one smart platform built to simplify bookings
            and attract more customers.
          </p>
        </div>

        {/* LINKS */}
        <div className="footer-links-section">
          <h3>Quick Links</h3>

          <Link to="/my-businesses">
            <Building2 size={15} />
            My Businesses
          </Link>
          <Link to="/manage-services">
            <BriefcaseBusiness size={15} />
            Manage Services
          </Link>
          <Link to="/business-settings">
            <Clock3 size={15} />
            Working Hours
          </Link>
          <Link to="/business/analytics">
            <BarChart3 size={15} />
            Analytics
          </Link>
          <Link to="/owner-appointments">
            <CalendarCheck size={15} />
            Appointments
          </Link>
        </div>

        {/* CONTACT */}
        <div className="footer-contact-section">
          <h3>Contact Us</h3>

          <div className="footer-contact-item">
            <Mail size={15} />
            <span>support@bookease.com</span>
          </div>
          <div className="footer-contact-item">
            <Phone size={15} />
            <span>+91 98765 43210</span>
          </div>

          <p className="footer-contact-text">
            Helping businesses streamline appointments and improve customer
            satisfaction, one booking at a time.
          </p>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} BookEase. All rights reserved.</p>
        <div className="footer-bottom-links">
          <a href="/">Privacy Policy</a>
          <a href="/">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}

// ── Main Dashboard export ──────────────────────────────────────────────────
export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      navigate('/admin', { replace: true });
    }
  }, [role, navigate]);

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
        <>
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

          {role === 'BUSINESS_OWNER' && (
            <>
              <OwnerTips />
              <FaqSection />
            </>
          )}
        </>
      )}
      <DashboardFooter />
    </div>
  );
}