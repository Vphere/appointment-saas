import { useEffect, useState } from 'react';
import { getAllUsers, updateUserRole, deleteUser } from '../api/admin';
import Spinner from '../components/Spinner';
import './AdminUserManagement.css';

const roleColor = (role) => ({
  CUSTOMER:       '#3b82f6',
  BUSINESS_OWNER: '#8b5cf6',
  SUPER_ADMIN:    '#ef4444',
}[role] || '#6b7280');

const roleIcon = (role) => ({
  CUSTOMER:       '👤',
  BUSINESS_OWNER: '🏢',
  SUPER_ADMIN:    '⚡',
}[role] || '👤');

// ── Role Change Modal ────────────────────────────────────────────
// Only allow CUSTOMER ↔ BUSINESS_OWNER.
// SUPER_ADMIN is locked — cannot be changed via UI.
function RoleModal({ user, onConfirm, onClose, loading }) {
  // Toggle between the two safe roles
  const targetRole = user.role === 'CUSTOMER' ? 'BUSINESS_OWNER' : 'CUSTOMER';

  return (
    <div className="aum-overlay" onClick={onClose}>
      <div className="aum-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aum-modal-icon">🔄</div>
        <h3>Change User Role</h3>

        <div className="aum-role-change-preview">
          <div className="aum-role-chip" style={{ '--rc': roleColor(user.role) }}>
            {roleIcon(user.role)} {user.role.replace('_', ' ')}
          </div>
          <span className="aum-role-arrow">→</span>
          <div className="aum-role-chip aum-role-chip-target" style={{ '--rc': roleColor(targetRole) }}>
            {roleIcon(targetRole)} {targetRole.replace('_', ' ')}
          </div>
        </div>

        <p className="aum-modal-desc">
          <strong>{user.name || user.email}</strong> will be changed from{' '}
          <strong>{user.role.replace('_', ' ')}</strong> to{' '}
          <strong>{targetRole.replace('_', ' ')}</strong>.
          {targetRole === 'BUSINESS_OWNER'
            ? ' They will be able to register and manage businesses.'
            : ' Their business owner privileges will be removed.'}
        </p>

        <div className="aum-modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => onConfirm(targetRole)}
            disabled={loading}
          >
            {loading ? '⏳ Updating…' : `Confirm — Set as ${targetRole.replace('_', ' ')}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ─────────────────────────────────────────
function DeleteModal({ user, onConfirm, onClose, loading }) {
  return (
    <div className="aum-overlay" onClick={onClose}>
      <div className="aum-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aum-modal-icon">⚠️</div>
        <h3>Delete User?</h3>
        <p className="aum-modal-desc">
          Permanently delete <strong>{user.name || user.email}</strong>?
          All their data including appointments and reviews will be removed.
          This cannot be undone.
        </p>
        <div className="aum-modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? '⏳' : '🗑 Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function AdminUserManagement() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterRole, setFilterRole]   = useState('ALL');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage]         = useState({ text: '', type: '' });
  const [roleTarget, setRoleTarget]   = useState(null);   // user to change role
  const [deleteTarget, setDeleteTarget] = useState(null); // user to delete

  const fetchUsers = () => {
    setLoading(true);
    getAllUsers()
      .then((r) => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3500);
  };

  const handleRoleChange = async (newRole) => {
    setActionLoading(true);
    try {
      const res = await updateUserRole(roleTarget.id, newRole);
      setUsers((prev) => prev.map((u) => u.id === roleTarget.id ? { ...u, role: res.data.role } : u));
      showMsg(`✓ ${roleTarget.name || roleTarget.email} is now ${newRole.replace('_', ' ')}`);
      setRoleTarget(null);
    } catch (e) {
      showMsg(e.response?.data?.message || '✗ Failed to update role', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      showMsg('✓ User deleted successfully');
      setDeleteTarget(null);
    } catch (e) {
      showMsg(e.response?.data?.message || '✗ Failed to delete user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const counts = {
    ALL:            users.length,
    CUSTOMER:       users.filter((u) => u.role === 'CUSTOMER').length,
    BUSINESS_OWNER: users.filter((u) => u.role === 'BUSINESS_OWNER').length,
    SUPER_ADMIN:    users.filter((u) => u.role === 'SUPER_ADMIN').length,
  };

  const filtered = users.filter((u) => {
    const matchRole   = filterRole === 'ALL' || u.role === filterRole;
    const q           = search.toLowerCase();
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  if (loading) return <div className="page-container"><Spinner message="Loading users…" /></div>;

  return (
    <div className="page-container aum-root">

      {/* Header */}
      <div className="page-header flex-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} registered users</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchUsers}>↻ Refresh</button>
      </div>

      {/* Stats chips */}
      <div className="aum-stats-row">
        {[
          { label: 'Total',    count: counts.ALL,            icon: '👥', color: '#6c63ff' },
          { label: 'Customers', count: counts.CUSTOMER,      icon: '👤', color: '#3b82f6' },
          { label: 'Owners',   count: counts.BUSINESS_OWNER, icon: '🏢', color: '#8b5cf6' },
          { label: 'Admins',   count: counts.SUPER_ADMIN,    icon: '⚡', color: '#ef4444' },
        ].map((s) => (
          <div key={s.label} className="aum-stat-chip" style={{ '--chip-color': s.color }}>
            <span>{s.icon}</span>
            <strong>{s.count}</strong>
            <span className="aum-stat-chip-label">{s.label}</span>
          </div>
        ))}
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="aum-toolbar">
        <input
          type="text"
          className="aum-search"
          placeholder="🔍  Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-bar" style={{ margin: 0 }}>
          {['ALL', 'CUSTOMER', 'BUSINESS_OWNER', 'SUPER_ADMIN'].map((r) => (
            <button
              key={r}
              className={`filter-btn ${filterRole === r ? 'active' : ''}`}
              onClick={() => setFilterRole(r)}
            >
              {r === 'ALL' ? `All (${counts.ALL})` : `${roleIcon(r)} ${r.replace('_', ' ')} (${counts[r]})`}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>No users found</h3>
          <p>Try a different search or filter</p>
        </div>
      ) : (
        <div className="aum-list">
          {filtered.map((user) => {
            const isAdmin = user.role === 'SUPER_ADMIN';
            return (
              <div key={user.id} className="aum-user-card card">
                {/* Avatar */}
                <div className="aum-avatar" style={{ '--av-color': roleColor(user.role) }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>

                {/* Info */}
                <div className="aum-user-info">
                  <div className="aum-user-name">{user.name || '—'}</div>
                  <div className="aum-user-email">{user.email}</div>
                  {user.phone && <div className="aum-user-phone">📞 {user.phone}</div>}
                </div>

                {/* Role badge */}
                <div className="aum-role-badge" style={{ '--rb-color': roleColor(user.role) }}>
                  {roleIcon(user.role)} {user.role?.replace('_', ' ')}
                </div>

                {/* Actions */}
                <div className="aum-actions">
                  {isAdmin ? (
                    // SUPER_ADMIN — locked, no actions
                    <div className="aum-locked-badge" title="Super Admin role cannot be changed via UI">
                      🔒 Protected
                    </div>
                  ) : (
                    // Regular users — show change role + delete
                    <>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setRoleTarget(user)}
                        title={`Switch to ${user.role === 'CUSTOMER' ? 'Business Owner' : 'Customer'}`}
                      >
                        🔄 Change Role
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteTarget(user)}
                        title="Delete user"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role modal */}
      {roleTarget && (
        <RoleModal
          user={roleTarget}
          onConfirm={handleRoleChange}
          onClose={() => setRoleTarget(null)}
          loading={actionLoading}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}