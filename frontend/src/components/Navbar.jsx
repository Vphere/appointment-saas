import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import BookEaseLogo from './BookEaseLogo';
import './Navbar.css';

const CUSTOMER_NAV = [
  { to: '/dashboard',       label: '🏠 Home' },
  { to: '/all-services',    label: '⚡ Browse Services' },
  { to: '/businesses',      label: '🏪 Businesses' },
  { to: '/my-appointments', label: '📅 My Appointments' },
];

const OWNER_NAV = [
  { to: '/dashboard',          label: '🏠 Home' },
  { to: '/my-businesses',      label: '🏢 My Businesses' },
  { to: '/manage-services',    label: '🛠️ Services' },
  { to: '/business-settings',  label: '⚙️ Settings' },
  { to: '/owner-appointments', label: '📋 Appointments' },
  { to: '/business/analytics', label: '📊 Analytics' },
];

const ADMIN_NAV = [
  { to: '/admin',           label: '📊 Dashboard' },
  { to: '/admin/approvals', label: '✅ Approvals' },
  { to: '/admin/users',     label: '👥 Users' },
  { to: '/admin/reviews',   label: '⭐ Reviews' },
];

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Navbar() {
  const { user, role, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!user) return null;

  const navItems =
    role === 'CUSTOMER'       ? CUSTOMER_NAV :
    role === 'BUSINESS_OWNER' ? OWNER_NAV    :
    role === 'SUPER_ADMIN'    ? ADMIN_NAV    : [];

  const handleLogout = () => {
    setAvatarOpen(false);
    setMenuOpen(false);
    logoutUser();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        <NavLink
          to={role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'}
          className="navbar-brand"
        >
          <BookEaseLogo height={45} />
          {role === 'SUPER_ADMIN' && (
            <span className="navbar-admin-badge">ADMIN</span>
          )}
        </NavLink>

        <ul className={`navbar-nav ${menuOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}

          <li className="mobile-only">
            <NavLink
              to="/profile"
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setMenuOpen(false)}
            >
              👤 My Profile
            </NavLink>
          </li>
          <li className="mobile-only">
            <button className="nav-logout" onClick={handleLogout}>
              ↩ Logout
            </button>
          </li>
        </ul>

        <div className="navbar-right desktop-only">
          <div className="avatar-wrapper" ref={dropdownRef}>
            <button
              className="avatar-btn"
              onClick={() => setAvatarOpen((v) => !v)}
              title={user.name || 'Profile'}
            >
              {getInitials(user.name || 'U')}
            </button>

            {avatarOpen && (
              <div className="avatar-dropdown">
                <div className="avatar-dropdown-header">
                  <div className="avatar-dropdown-avatar">
                    {getInitials(user.name || 'U')}
                  </div>
                  <div>
                    <p className="avatar-dropdown-name">{user.name || 'User'}</p>
                    <p className="avatar-dropdown-email">{user.email || ''}</p>
                    {role === 'SUPER_ADMIN' && (
                      <p className="avatar-dropdown-role-tag">⚡ Super Admin</p>
                    )}
                  </div>
                </div>

                <div className="avatar-dropdown-divider" />

                {role !== 'SUPER_ADMIN' && (
                  <NavLink
                    to="/profile"
                    className="avatar-dropdown-item"
                    onClick={() => setAvatarOpen(false)}
                  >
                    👤 My Profile
                  </NavLink>
                )}

                {role === 'CUSTOMER' && (
                  <NavLink
                    to="/my-appointments"
                    className="avatar-dropdown-item"
                    onClick={() => setAvatarOpen(false)}
                  >
                    📅 My Appointments
                  </NavLink>
                )}

                {role === 'SUPER_ADMIN' && (
                  <>
                    <NavLink to="/admin"           className="avatar-dropdown-item" onClick={() => setAvatarOpen(false)}>📊 Analytics</NavLink>
                    <NavLink to="/admin/approvals" className="avatar-dropdown-item" onClick={() => setAvatarOpen(false)}>✅ Approvals</NavLink>
                    <NavLink to="/admin/users"     className="avatar-dropdown-item" onClick={() => setAvatarOpen(false)}>👥 Users</NavLink>
                    <NavLink to="/admin/reviews"   className="avatar-dropdown-item" onClick={() => setAvatarOpen(false)}>⭐ Reviews</NavLink>
                  </>
                )}

                <div className="avatar-dropdown-divider" />

                <button
                  className="avatar-dropdown-item avatar-dropdown-logout"
                  onClick={handleLogout}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>

          <button className="nav-logout" onClick={handleLogout}>
            ↩ Logout
          </button>
        </div>

        <button
          className="navbar-mobile-menu"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>

      </div>
    </nav>
  );
}