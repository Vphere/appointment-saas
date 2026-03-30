import { useEffect, useState } from 'react';
import { getAllBusinesses } from '../api/business';
import axiosInstance from '../api/axiosInstance';
import Spinner from '../components/Spinner';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Use admin dashboard API for stats, fall back to getAllBusinesses for compatibility
      let data = null;
      try {
        const response = await fetch('/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          data = await response.json();
        }
      } catch {
        // Fallback to getAllBusinesses if admin endpoint fails
        const [allRes, pendingRes] = await Promise.all([
          getAllBusinesses(),
          axiosInstance.get('/api/business/pending').catch(() => ({ data: [] }))
        ]);
        
        const businesses = Array.isArray(allRes.data) ? allRes.data : [];
        const pending = Array.isArray(pendingRes.data) ? pendingRes.data : [];
        
        const counts = {
          total: businesses.length,
          pending: pending.length,
          approved: businesses.filter((b) => (b.status || b.approvalStatus || '').toUpperCase() === 'APPROVED').length,
          rejected: businesses.filter((b) => (b.status || b.approvalStatus || '').toUpperCase() === 'REJECTED').length,
        };
        
        data = {
          ...counts,
          recentBusinesses: businesses
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 5)
        };
      }
      setDashboardData(data);
    } catch {
      setDashboardData({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        recentBusinesses: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  if (loading || !dashboardData) return <div className="page-container"><Spinner message="Loading dashboard..." /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Business registration overview</p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card stat-total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{dashboardData.total}</div>
            <div className="stat-label">Total Businesses</div>
          </div>
        </div>

        <div className="stat-card stat-pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{dashboardData.pending}</div>
            <div className="stat-label">Pending Review</div>
          </div>
        </div>

        <div className="stat-card stat-approved">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{dashboardData.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>

        <div className="stat-card stat-rejected">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value">{dashboardData.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <h2 className="section-title">Recent Registrations</h2>
        <div className="recent-list">
          {dashboardData.recentBusinesses.map((business) => {
            const status = (business.status || business.approvalStatus || 'PENDING').toUpperCase();
            const isPending = status === 'PENDING';
            return (
              <div key={business.id} className="recent-item">
                <div className="recent-info">
                  <div className="recent-name">{business.name}</div>
                  <div className="recent-meta">
                    Owner: {business.ownerName || business.ownerEmail || `ID #${business.ownerId || '?'}`}
                    {business.createdAt && (
                      <span> • Requested on {new Date(business.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className={`status-badge status-${status.toLowerCase()}`}>
                  {status}
                </div>
                {isPending && (
                  <div className="recent-actions">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => window.location.href = `/admin/approvals`}
                    >
                      Review
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {dashboardData.recentBusinesses.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No business registrations yet</h3>
              <p>Businesses will appear here when owners register them</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
