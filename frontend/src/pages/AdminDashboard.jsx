import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats } from '../api/admin';
import Spinner from '../components/Spinner';
import './AdminDashboard.css';

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="adb-stat-card" style={{ '--accent': color }}>
    <div className="adb-stat-icon">{icon}</div>
    <div className="adb-stat-body">
      <div className="adb-stat-value">{value ?? '—'}</div>
      <div className="adb-stat-label">{label}</div>
      {sub && <div className="adb-stat-sub">{sub}</div>}
    </div>
  </div>
);

const QuickLink = ({ to, icon, title, desc, badge }) => (
  <Link to={to} className="adb-quick-link">
    <div className="adb-ql-icon">{icon}</div>
    <div className="adb-ql-body">
      <div className="adb-ql-title">{title}</div>
      <div className="adb-ql-desc">{desc}</div>
    </div>
    {badge != null && <span className="adb-ql-badge">{badge}</span>}
    <span className="adb-ql-arrow">→</span>
  </Link>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAdminStats()
      .then((r) => setStats(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><Spinner message="Loading analytics…" /></div>;

  if (error || !stats) return (
    <div className="page-container">
      <div className="alert alert-error">Failed to load dashboard stats. Make sure the backend /api/admin/stats endpoint is available.</div>
    </div>
  );

  const approvalRate = stats.totalBusinesses > 0
    ? Math.round((stats.approvedBusinesses / stats.totalBusinesses) * 100)
    : 0;

  const completionRate = stats.totalAppointments > 0
    ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
    : 0;

  return (
    <div className="page-container adb-root">

      {/* Header */}
      <div className="adb-header">
        <div>
          <h1 className="adb-title">Admin Analytics</h1>
          <p className="adb-subtitle">Platform overview at a glance</p>
        </div>
        <div className="adb-header-time">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ── Section 1: Business Stats ─────────────────────────────────────── */}
      <div className="adb-section-label">🏢 Businesses</div>
      <div className="adb-stats-grid">
        <StatCard icon="📊" label="Total Registered" value={stats.totalBusinesses} color="#6c63ff" />
        <StatCard icon="⏳" label="Pending Review" value={stats.pendingBusinesses} color="#f59e0b"
          sub={stats.pendingBusinesses > 0 ? 'Needs attention' : 'All clear!'} />
        <StatCard icon="✅" label="Approved" value={stats.approvedBusinesses}
          sub={`${approvalRate}% approval rate`} color="#10b981" />
        <StatCard icon="❌" label="Rejected" value={stats.rejectedBusinesses} color="#ef4444" />
      </div>

      {/* Approval rate bar */}
      <div className="adb-rate-bar-wrap">
        <div className="adb-rate-bar-label">
          <span>Business Approval Rate</span>
          <strong>{approvalRate}%</strong>
        </div>
        <div className="adb-rate-bar-track">
          <div className="adb-rate-bar-fill adb-fill-green" style={{ width: `${approvalRate}%` }} />
        </div>
      </div>

      {/* ── Section 2: User Stats ─────────────────────────────────────────── */}
      <div className="adb-section-label">👤 Users</div>
      <div className="adb-stats-grid adb-grid-3">
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers} color="#6c63ff" />
        <StatCard icon="🛒" label="Customers" value={stats.totalCustomers} color="#3b82f6" />
        <StatCard icon="🏢" label="Business Owners" value={stats.totalBusinessOwners} color="#8b5cf6" />
      </div>

      {/* ── Section 3: Appointment Stats ──────────────────────────────────── */}
      <div className="adb-section-label">📅 Appointments</div>
      <div className="adb-stats-grid adb-grid-3">
        <StatCard icon="📋" label="Total Bookings" value={stats.totalAppointments} color="#6c63ff" />
        <StatCard icon="🎉" label="Completed"
          value={stats.completedAppointments}
          sub={`${completionRate}% completion rate`}
          color="#10b981" />
        <StatCard icon="🚫" label="Cancelled" value={stats.cancelledAppointments} color="#ef4444" />
      </div>

      <div className="adb-rate-bar-wrap">
        <div className="adb-rate-bar-label">
          <span>Appointment Completion Rate</span>
          <strong>{completionRate}%</strong>
        </div>
        <div className="adb-rate-bar-track">
          <div className="adb-rate-bar-fill adb-fill-blue" style={{ width: `${completionRate}%` }} />
        </div>
      </div>

      {/* ── Section 4: Review Stats ───────────────────────────────────────── */}
      <div className="adb-section-label">⭐ Reviews</div>
      <div className="adb-stats-grid adb-grid-2">
        <StatCard icon="💬" label="Total Reviews" value={stats.totalReviews} color="#6c63ff" />
        <StatCard
          icon="⭐"
          label="Platform Avg Rating"
          value={stats.averageRating ? `${Number(stats.averageRating).toFixed(1)} / 5` : 'N/A'}
          color="#f59e0b"
        />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="adb-section-label">⚡ Quick Actions</div>
      <div className="adb-quick-links">
        <QuickLink
          to="/admin/approvals"
          icon="✅"
          title="Business Approvals"
          desc="Review and approve pending registrations"
          badge={stats.pendingBusinesses > 0 ? stats.pendingBusinesses : null}
        />
        <QuickLink
          to="/admin/users"
          icon="👥"
          title="User Management"
          desc="View, manage roles, and remove users"
          badge={stats.totalUsers}
        />
        <QuickLink
          to="/admin/reviews"
          icon="⭐"
          title="Review Moderation"
          desc="Browse and remove inappropriate reviews"
          badge={stats.totalReviews}
        />
      </div>
    </div>
  );
}