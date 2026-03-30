import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const CUSTOMER_NAV = [
  { to: '/dashboard',        label: '🏠 Home' },
  { to: '/all-services',     label: '⚡ Browse Services' },
  { to: '/businesses',       label: '🏪 Businesses' },
  { to: '/my-appointments',  label: '📅 My Appointments' },
];

const OWNER_NAV = [
  { to: '/dashboard',          label: '🏠 Home' },
  { to: '/my-businesses',      label: '🏢 My Businesses' },
  { to: '/manage-services',    label: '⚙️ Services' },
  { to: '/working-hours',      label: '🕐 Hours' },
  { to: '/owner-appointments', label: '📋 Appointments' },
];

const ADMIN_NAV = [
  { to: '/dashboard', label: '🏠 Home' },
  { to: '/admin',     label: '✅ Approve Businesses' },
];

export default function Navbar() {
  const { user, role, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const navItems =
    role === 'CUSTOMER'       ? CUSTOMER_NAV :
    role === 'BUSINESS_OWNER' ? OWNER_NAV :
    role === 'SUPER_ADMIN'    ? ADMIN_NAV : [];

  const handleLogout = () => { logoutUser(); navigate('/'); };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/dashboard" className="navbar-brand">
          <div className="brand-icon">📆</div>
          BookEase
        </NavLink>

        {/* Desktop nav */}
        <ul className={`navbar-nav ${menuOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => isActive ? 'active' : ''}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
          <li>
            <button className="nav-logout" onClick={handleLogout}>
              ↩ Logout
            </button>
          </li>
        </ul>

        {/* Hamburger */}
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
