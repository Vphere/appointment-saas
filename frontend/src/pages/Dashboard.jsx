import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { getAllServices } from '../api/services';
import { getApprovedBusinesses } from '../api/business';
import BookEaseLogo from '../components/BookEaseLogo';
import {
  CalendarDays, Building2, BriefcaseBusiness, Clock3,
  BarChart3, CalendarCheck, Mail, Phone, Zap, Star,
  ShieldCheck, Users, TrendingUp, Sparkles,
} from 'lucide-react';
import './Dashboard.css';

// ── Constants ─────────────────────────────────────────────────────
const OWNER_ACTIONS = [
  { to: '/my-businesses',      icon: '🏢', title: 'My Businesses',                    desc: 'Manage your registered businesses', accent: 'violet' },
  { to: '/manage-services',    icon: '⚙️', title: 'Manage Services',                  desc: 'Add and update your services', accent: 'blue' },
  { to: '/business-settings',  icon: '🕓', title: 'Working Hours & Holidays',         desc: 'Set availability, block holidays, upload photos', accent: 'green' },
  { to: '/owner-appointments', icon: '📋', title: 'Appointments',                     desc: 'View and manage customer bookings', accent: 'amber' },
];

const OWNER_TIPS = [
  { icon: '🕐', title: 'Set Working Hours',        desc: 'Configure service hours so customers can book slots accurately.',     to: '/business-settings' },
  { icon: '📷', title: 'Add Service Photos',       desc: 'Businesses with photos get significantly more bookings.',             to: '/business-settings' },
  { icon: '📅', title: 'Mark Holiday Closures',    desc: 'Avoid missed bookings — block your holidays in Business Settings.',   to: '/business-settings' },
  { icon: '⭐', title: 'Monitor Business Revenue', desc: 'Track revenue, appointment history and performance trends.',          to: '/business/analytics' },
];

const FAQS = [
  { q: 'How do I add a new service?',                    a: 'Go to Manage Services, pick your business, then click "+ Add Service". Fill in name, price, duration and location.' },
  { q: 'Can I set different hours for different services?', a: 'Yes! Go to Business Settings → Working Hours, select a business and service, then configure hours per day.' },
  { q: "How do I block a holiday?",                      a: 'Navigate to Business Settings → Holidays. Select your business, pick a date, optionally add a reason, and save.' },
  { q: 'Where can I see revenue and appointment trends?', a: 'The Analytics page (top nav → Analytics) shows monthly revenue, status breakdown, service earnings and reviews.' },
  { q: 'What happens after I register a business?',      a: 'It enters a Pending state and is reviewed by our admin team. Once approved, you can add services and accept bookings.' },
];

// ── Platform stats (shown in hero for everyone) ───────────────────
const PLATFORM_STATS = [
  { icon: <Users size={18} />,      label: 'Active Users',    value: '10,000+' },
  { icon: <Building2 size={18} />,  label: 'Businesses',      value: '500+' },
  { icon: <CalendarDays size={18} />, label: 'Bookings Made', value: '50,000+' },
  { icon: <Star size={18} />,       label: 'Avg. Rating',     value: '4.8 ★' },
];

// ── Platform features (shown to all roles in "What We Offer") ─────
const PLATFORM_FEATURES = [
  { icon: <Zap size={20} />,         title: 'Instant Booking',      desc: 'Book any service in under 30 seconds. No calls, no waiting.' },
  { icon: <ShieldCheck size={20} />, title: 'Verified Businesses',  desc: 'Every business is admin-verified before accepting bookings.' },
  { icon: <TrendingUp size={20} />,  title: 'Real-time Analytics',  desc: 'Business owners get live revenue and appointment dashboards.' },
  { icon: <Sparkles size={20} />,    title: 'Smart Scheduling',     desc: 'Automatic slot management, gap buffers and holiday blocking.' },
];

// ── FAQ accordion ─────────────────────────────────────────────────
function FaqSection() {
  const [open, setOpen] = useState(null);
  return (
    <div className="db-section" style={{ marginTop: 40 }}>
      <div className="db-section-eyebrow">❓ FAQ</div>
      <h2 className="db-section-title">Frequently Asked Questions</h2>
      <div className="db-faq">
        {FAQS.map((faq, i) => (
          <div key={i} className={`db-faq-item ${open === i ? 'open' : ''}`}>
            <button className="db-faq-q" onClick={() => setOpen(open === i ? null : i)}>
              <span>{faq.q}</span>
              <span className="db-faq-chevron">{open === i ? '▲' : '▼'}</span>
            </button>
            {open === i && <div className="db-faq-a">{faq.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── "What We Offer" platform section ─────────────────────────────
function PlatformSection() {
  return (
    <div className="db-platform-section">
      <div className="db-section-eyebrow">✦ WHAT WE OFFER</div>
      <h2 className="db-section-title">Everything you need in one place</h2>
      <p className="db-section-sub">
        BookEase connects customers with verified service businesses — from salons to gyms, clinics to consultants.
        Book instantly, manage effortlessly.
      </p>
      <div className="db-features-grid">
        {PLATFORM_FEATURES.map((f, i) => (
          <div key={i} className="db-feature-card">
            <div className="db-feature-icon">{f.icon}</div>
            <h3 className="db-feature-title">{f.title}</h3>
            <p className="db-feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Customer dashboard ────────────────────────────────────────────
function CustomerDashboard() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllServices(), getApprovedBusinesses()])
      .then(([sRes, bRes]) => {
        setServices((Array.isArray(sRes.data) ? sRes.data : []).slice(0, 6));
        const bMap = {};
        (bRes.data || []).forEach(b => { bMap[b.id] = b; });
        setBusinesses(bMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Quick Actions */}
      <div className="db-section">
        <div className="db-section-eyebrow">⚡ QUICK ACTIONS</div>
        <h2 className="db-section-title">What would you like to do?</h2>
        <div className="db-actions-grid">
          <Link to="/all-services" className="db-action-card" style={{ textDecoration: 'none' }}>
            <div className="db-action-card-inner">
              <div className="db-action-icon">⚡</div>
              <h3 className="db-action-title">Browse Services</h3>
              <p className="db-action-desc">Search &amp; book any service directly</p>
              <div className="db-action-arrow">→</div>
            </div>
          </Link>
          <Link to="/businesses" className="db-action-card" style={{ textDecoration: 'none' }}>
            <div className="db-action-card-inner">
              <div className="db-action-icon">🏪</div>
              <h3 className="db-action-title">Browse Businesses</h3>
              <p className="db-action-desc">Explore businesses and their offerings</p>
              <div className="db-action-arrow">→</div>
            </div>
          </Link>
          <Link to="/my-appointments" className="db-action-card" style={{ textDecoration: 'none' }}>
            <div className="db-action-card-inner">
              <div className="db-action-icon">📅</div>
              <h3 className="db-action-title">My Appointments</h3>
              <p className="db-action-desc">View and manage your bookings</p>
              <div className="db-action-arrow">→</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Popular Services */}
      <div className="db-section">
        <div className="db-section-header-row">
          <div>
            <div className="db-section-eyebrow">🔥 TRENDING</div>
            <h2 className="db-section-title" style={{ margin: 0 }}>Popular Services</h2>
          </div>
          <Link to="/all-services" className="db-view-all">View all →</Link>
        </div>

        {loading ? (
          <div className="db-loading">Loading services…</div>
        ) : services.length === 0 ? (
          <div className="alert alert-info">No services available yet.</div>
        ) : (
          <div className="db-services-grid">
            {services.map(service => {
              const biz = businesses[service.businessId] || {};
              return (
                <div
                  key={service.id}
                  className="db-service-card"
                  onClick={() => navigate(`/book/${service.businessId}`, {
                    state: { business: biz, preSelectedServiceId: service.id }
                  })}
                >
                  <div className="db-svc-top">
                    <span className="db-svc-name">{service.name}</span>
                    <span className="db-svc-price">₹{service.price}</span>
                  </div>
                  {biz.name && (
                    <p className="db-svc-biz">🏪 {biz.name}{biz.city && ` · ${biz.city}`}</p>
                  )}
                  {(service.duration || service.durationMinutes) && (
                    <p className="db-svc-meta">⏱ {service.duration || service.durationMinutes} min</p>
                  )}
                  <div className="db-svc-book">Book Now →</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PlatformSection />
    </>
  );
}

// ── Owner dashboard ───────────────────────────────────────────────
function OwnerDashboard() {
  return (
    <>
      {/* Quick Actions */}
      <div className="db-section">
        <div className="db-section-eyebrow">⚡ QUICK ACTIONS</div>
        <h2 className="db-section-title">Manage your business</h2>
        <div className="db-actions-grid db-actions-grid--4">
          {OWNER_ACTIONS.map(action => (
            <Link key={action.to} to={action.to} className={`db-action-card db-action-card--${action.accent}`} style={{ textDecoration: 'none' }}>
              <div className="db-action-icon">{action.icon}</div>
              <h3 className="db-action-title">{action.title}</h3>
              <p className="db-action-desc">{action.desc}</p>
              <div className="db-action-arrow">→</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="db-section">
        <div className="db-section-eyebrow">💡 TIPS</div>
        <h2 className="db-section-title">Get the most out of BookEase</h2>
        <div className="db-tips-grid">
          {OWNER_TIPS.map(tip => (
            <Link key={tip.title} to={tip.to} className="db-tip-card" style={{ textDecoration: 'none' }}>
              <span className="db-tip-icon">{tip.icon}</span>
              <div>
                <div className="db-tip-title">{tip.title}</div>
                <div className="db-tip-desc">{tip.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <FaqSection />
      <PlatformSection />
    </>
  );
}

// ── Customer footer ───────────────────────────────────────────────
function CustomerFooter() {
  return (
    <footer className="db-footer">
      <div className="db-footer-glow" />

      <div className="db-footer-top-banner">
        <div className="db-footer-top-eyebrow">✦ JOIN THOUSANDS OF HAPPY USERS</div>
        <h2 className="db-footer-top-title">Find and book the services you love</h2>
        <p className="db-footer-top-sub">
          From haircuts to healthcare, fitness to consulting — BookEase connects you with
          the best local services, verified and ready to book in seconds.
        </p>
        <div className="db-footer-stats">
          {PLATFORM_STATS.map((s, i) => (
            <div key={i} className="db-footer-stat">
              <div className="db-footer-stat-icon">{s.icon}</div>
              <div className="db-footer-stat-val">{s.value}</div>
              <div className="db-footer-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="db-footer-main">
        {/* Brand */}
        <div className="db-footer-brand">
          <BookEaseLogo height={45} style={{ marginBottom: 4 }} />
          <p className="db-footer-brand-tag">Smart appointment booking platform</p>
          <p className="db-footer-brand-desc">
            Connecting customers with verified service businesses — making every booking
            instant, reliable and hassle-free.
          </p>
        </div>

        {/* Customer links */}
        <div className="db-footer-col">
          <h3 className="db-footer-col-title">Explore</h3>
          <Link to="/all-services"><Zap size={14} /> Browse Services</Link>
          <Link to="/businesses"><Building2 size={14} /> Businesses</Link>
          <Link to="/my-appointments"><CalendarDays size={14} /> My Appointments</Link>
        </div>

        {/* Contact */}
        <div className="db-footer-col">
          <h3 className="db-footer-col-title">Contact Us</h3>
          <div className="db-footer-contact-item"><Mail size={14} /><span>devsquad45@gmail.com</span></div>
          <div className="db-footer-contact-item"><Phone size={14} /><span>+91 98765 43210</span></div>
          <p className="db-footer-contact-text">
            We're here to help — Mon to Sat, 9 AM to 6 PM IST.
          </p>
        </div>
      </div>

      <div className="db-footer-bottom">
        <p>© {new Date().getFullYear()} BookEase. All rights reserved.</p>
        <div className="db-footer-bottom-links">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-of-service">Terms of Service</Link>
        </div>
      </div>
      
    </footer>
  );
}

// ── Owner footer ──────────────────────────────────────────────────
function OwnerFooter() {
  return (
    <footer className="db-footer db-footer--owner">
      <div className="db-footer-glow" />

      <div className="db-footer-top-banner">
        <div className="db-footer-top-eyebrow">✦ GROW WITH BOOKEASE</div>
        <h2 className="db-footer-top-title">Smarter appointment management for your business</h2>
        <p className="db-footer-top-sub">
          Streamline scheduling, manage services across locations, block holidays, track revenue
          and deliver better customer experiences — all from one platform built for modern businesses.
        </p>
        <div className="db-footer-stats">
          {PLATFORM_STATS.map((s, i) => (
            <div key={i} className="db-footer-stat">
              <div className="db-footer-stat-icon">{s.icon}</div>
              <div className="db-footer-stat-val">{s.value}</div>
              <div className="db-footer-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="db-footer-main">
        {/* Brand */}
        <div className="db-footer-brand">
          <BookEaseLogo height={45} style={{ marginBottom: 4 }} />
          <p className="db-footer-brand-tag">Smart appointment booking platform</p>
          <p className="db-footer-brand-desc">
            Helping small businesses grow and large enterprises manage appointments efficiently —
            all from one smart platform built to simplify bookings and attract more customers.
          </p>
        </div>

        {/* Owner quick links */}
        <div className="db-footer-col">
          <h3 className="db-footer-col-title">Quick Links</h3>
          <Link to="/my-businesses"><Building2 size={14} /> My Businesses</Link>
          <Link to="/manage-services"><BriefcaseBusiness size={14} /> Manage Services</Link>
          <Link to="/business-settings"><Clock3 size={14} /> Working Hours</Link>
          <Link to="/business/analytics"><BarChart3 size={14} /> Analytics</Link>
          <Link to="/owner-appointments"><CalendarCheck size={14} /> Appointments</Link>
        </div>

        {/* Contact */}
        <div className="db-footer-col">
          <h3 className="db-footer-col-title">Contact Us</h3>
          <div className="db-footer-contact-item"><Mail size={14} /><span>devsquad45@gmail.com</span></div>
          <div className="db-footer-contact-item"><Phone size={14} /><span>+91 98765 43210</span></div>
          <p className="db-footer-contact-text">
            Need help? Our support team is available Mon to Sat, 9 AM to 6 PM IST.
          </p>
        </div>
      </div>

      <div className="db-footer-bottom">
        <p>© {new Date().getFullYear()} BookEase. All rights reserved.</p>
        <div className="db-footer-bottom-links">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-of-service">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

// ── Main Dashboard export ─────────────────────────────────────────
export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'SUPER_ADMIN') navigate('/admin', { replace: true });
  }, [role, navigate]);

  const firstName = user?.name?.split(' ')[0] || user?.sub?.split('@')[0] || 'there';

  const roleLabel = role === 'CUSTOMER' ? '👤 CUSTOMER'
    : role === 'BUSINESS_OWNER' ? '🏢 BUSINESS OWNER'
    : '⚡ ADMIN';

  const heroSub = role === 'CUSTOMER'
    ? 'Discover and book services from verified local businesses.'
    : role === 'BUSINESS_OWNER'
    ? 'Manage your services, track bookings and grow your business.'
    : 'Manage the platform, approve businesses and moderate content.';

  return (
    <div className="db-root">

      {/* ── Hero ── */}
      <div className="db-hero">
        <div className="db-hero-inner">
          <div className="db-hero-chip">{roleLabel}</div>
          <h1 className="db-hero-title">Welcome back, {firstName}! 👋</h1>
          <p className="db-hero-sub">{heroSub}</p>
        </div>
      </div>

      {/* ── Role content ── */}
      {role === 'CUSTOMER' ? <CustomerDashboard /> : <OwnerDashboard />}

      {/* ── Role-specific footer ── */}
      {role === 'CUSTOMER' ? <CustomerFooter /> : <OwnerFooter />}
    </div>
  );
}