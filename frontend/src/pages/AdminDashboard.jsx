import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats } from '../api/admin';
import Spinner from '../components/Spinner';
import './AdminDashboard.css';

function KpiCard({ icon, label, value, sub, color, trend }) {
  return (
    <div className="adb-kpi-card" style={{ '--kpi-color': color }}>
      <div className="adb-kpi-top">
        <div className="adb-kpi-icon-wrap" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
          <span className="adb-kpi-icon">{icon}</span>
        </div>
        {trend != null && (
          <span className={`adb-kpi-trend ${trend >= 0 ? 'adb-kpi-trend--up' : 'adb-kpi-trend--down'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="adb-kpi-value" style={{ color }}>{value ?? '—'}</div>
      <div className="adb-kpi-label">{label}</div>
      {sub && <div className="adb-kpi-sub">{sub}</div>}
    </div>
  );
}

function SectionHeader({ icon, title, badge }) {
  return (
    <div className="adb-section-hdr">
      <span className="adb-section-hdr-icon">{icon}</span>
      <span className="adb-section-hdr-title">{title}</span>
      {badge != null && <span className="adb-section-hdr-badge">{badge}</span>}
    </div>
  );
}

function RateBar({ label, value, color }) {
  return (
    <div className="adb-rate-bar-wrap">
      <div className="adb-rate-bar-label">
        <span>{label}</span>
        <strong style={{ color }}>{value}%</strong>
      </div>
      <div className="adb-rate-bar-track">
        <div className="adb-rate-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function QuickAction({ to, icon, title, desc, badge, color }) {
  return (
    <Link to={to} className="adb-action-card" style={{ '--action-color': color }}>
      <div className="adb-action-icon" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        {icon}
      </div>
      <div className="adb-action-body">
        <div className="adb-action-title">{title}</div>
        <div className="adb-action-desc">{desc}</div>
      </div>
      {badge != null && <span className="adb-action-badge" style={{ background: color }}>{badge}</span>}
      <span className="adb-action-arrow" style={{ color }}>→</span>
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    getAdminStats()
      .then(r => setStats(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><Spinner message="Loading analytics…" /></div>;
  if (error || !stats) return (
    <div className="page-container">
      <div className="alert alert-error">Failed to load dashboard stats.</div>
    </div>
  );

  const approvalRate   = stats.totalBusinesses > 0
    ? Math.round((stats.approvedBusinesses / stats.totalBusinesses) * 100) : 0;
  const completionRate = stats.totalAppointments > 0
    ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100) : 0;
  const cancellationRate = stats.totalAppointments > 0
    ? Math.round((stats.cancelledAppointments / stats.totalAppointments) * 100) : 0;

  return (
    <div className="page-container adb-root">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="adb-page-header">
        <div className="adb-page-header-left">
          <div className="adb-page-badge">ADMIN</div>
          <h1 className="adb-page-title">Admin Analytics</h1>
          <p className="adb-page-subtitle">Platform-wide overview at a glance</p>
        </div>
        <div className="adb-page-date">
          📅 {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </div>
      </div>

      {/* ── Businesses ──────────────────────────────────────────────── */}
      <SectionHeader icon="🏢" title="Businesses" />
      <div className="adb-kpi-grid adb-grid-4">
        <KpiCard icon="📊" label="Total Registered"  value={stats.totalBusinesses}   color="#6366f1" />
        <KpiCard icon="⏳" label="Pending Review"    value={stats.pendingBusinesses}  color="#f59e0b"
          sub={stats.pendingBusinesses > 0 ? '⚠️ Needs attention' : '✅ All clear!'} />
        <KpiCard icon="✅" label="Approved"          value={stats.approvedBusinesses} color="#10b981"
          sub={`${approvalRate}% approval rate`} />
        <KpiCard icon="❌" label="Rejected"          value={stats.rejectedBusinesses} color="#ef4444" />
      </div>
      <RateBar label="Business Approval Rate" value={approvalRate} color="#10b981" />

      {/* ── Users ───────────────────────────────────────────────────── */}
      <SectionHeader icon="👤" title="Users" />
      <div className="adb-kpi-grid adb-grid-3">
        <KpiCard icon="👥" label="Total Users"      value={stats.totalUsers}              color="#6366f1" />
        <KpiCard icon="🛒" label="Customers"        value={stats.totalCustomers}          color="#3b82f6" />
        <KpiCard icon="🏢" label="Business Owners"  value={stats.totalBusinessOwners}     color="#8b5cf6" />
      </div>

      {/* ── Appointments ────────────────────────────────────────────── */}
      <SectionHeader icon="📅" title="Appointments" />
      <div className="adb-kpi-grid adb-grid-3">
        <KpiCard icon="📋" label="Total Bookings" value={stats.totalAppointments}    color="#6366f1" />
        <KpiCard icon="🎉" label="Completed"      value={stats.completedAppointments} color="#10b981"
          sub={`${completionRate}% completion`} />
        <KpiCard icon="🚫" label="Cancelled"      value={stats.cancelledAppointments} color="#ef4444"
          sub={`${cancellationRate}% cancellation`} />
      </div>
      <RateBar label="Appointment Completion Rate" value={completionRate}   color="#6366f1" />

      {/* ── Reviews ─────────────────────────────────────────────────── */}
      <SectionHeader icon="⭐" title="Reviews" />
      <div className="adb-kpi-grid adb-grid-2">
        <KpiCard icon="💬" label="Total Reviews"      value={stats.totalReviews}   color="#6366f1" />
        <KpiCard icon="⭐" label="Platform Avg Rating"
          value={stats.averageRating ? `${Number(stats.averageRating).toFixed(1)} / 5.0` : 'N/A'}
          color="#f59e0b" />
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────── */}
      <SectionHeader icon="⚡" title="Quick Actions" />
      <div className="adb-actions-grid">
        <QuickAction
          to="/admin/approvals"
          icon="✅" color="#10b981"
          title="Business Approvals"
          desc="Review and approve pending registrations"
          badge={stats.pendingBusinesses > 0 ? stats.pendingBusinesses : null}
        />
        <QuickAction
          to="/admin/users"
          icon="👥" color="#6366f1"
          title="User Management"
          desc="View, manage roles, and moderate users"
          badge={stats.totalUsers}
        />
        <QuickAction
          to="/admin/reviews"
          icon="⭐" color="#f59e0b"
          title="Review Moderation"
          desc="Browse and remove inappropriate reviews"
          badge={stats.totalReviews}
        />
      </div>

    </div>
  );
}