import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getMyBusinesses } from '../api/business';
import { getMyServices, createService, updateService, deleteService } from '../api/services';
import Spinner from '../components/Spinner';
import '../styles/owner.css';

function EditServiceModal({ service, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: service.name || '',
    description: service.description || '',
    address: service.address || '',
    price: service.price ?? '',
    duration: service.duration ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateService(service.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        price: parseFloat(form.price),
        duration: parseInt(form.duration),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update service');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="owner-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="owner-modal">
        <div className="owner-modal-header">
          <span className="owner-modal-title">✏️ Edit Service</span>
          <button className="owner-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Service Name *</label>
              <input className="form-input" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Price (₹) *</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (min) *</label>
              <input className="form-input" type="number" min="1" value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Optional description" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Address / Location</label>
              <input className="form-input" placeholder="e.g. 2nd Floor, Mall Road" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Saving...' : '✓ Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageServices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const preSelectedBusinessId = searchParams.get('businessId');

  const [businesses, setBusinesses]         = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(preSelectedBusinessId || '');
  const [services, setServices]             = useState([]);
  const [loadingB, setLoadingB]             = useState(true);
  const [loadingS, setLoadingS]             = useState(false);
  const [showForm, setShowForm]             = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', address: '', price: '', duration: '' });
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
  getMyBusinesses()
    .then((r) => {
      const approvedBusinesses = r.data.filter(
        (b) => (b.status || b.approvalStatus || '').toUpperCase() === 'APPROVED'
      );

      setBusinesses(approvedBusinesses);

      // ✅ SAFETY CHECK (PUT IT HERE)
      if (preSelectedBusinessId) {
        const exists = approvedBusinesses.some(
          (b) => String(b.id) === String(preSelectedBusinessId)
        );

        if (!exists) {
          setSelectedBusiness(''); // reset if invalid
        }
      }
    })
    .catch(() => {})
    .finally(() => setLoadingB(false));
  }, []);

  const fetchServices = (bizId) => {
    setLoadingS(true);
    getMyServices(bizId)
      .then((r) => setServices(Array.isArray(r.data) ? r.data : []))
      .catch(() => setServices([]))
      .finally(() => setLoadingS(false));
  };

  useEffect(() => {
    if (!selectedBusiness) return;
    fetchServices(selectedBusiness);
  }, [selectedBusiness]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!selectedBusiness) return setError('Please select a business first');
    if (!form.name.trim()) return setError('Service name is required');
    if (!form.price || isNaN(parseFloat(form.price))) return setError('Valid price is required');
    if (!form.duration || isNaN(parseInt(form.duration))) return setError('Duration (minutes) is required');

    setSubmitting(true);
    try {
      await createService({
        businessId: parseInt(selectedBusiness),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        price: parseFloat(form.price),
        duration: parseInt(form.duration),
      });
      setForm({ name: '', description: '', address: '', price: '', duration: '' });
      setShowForm(false);
      setSuccess('✓ Service created successfully!');
      setTimeout(() => setSuccess(''), 4000);
      fetchServices(selectedBusiness);
    } catch (err) {
      const msg = err.response?.data?.message ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        err.message || 'Failed to create service';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this service?')) return;
    try {
      await deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete service');
    }
  };

  if (loadingB) return <div className="page-container"><Spinner /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Manage Services</h1>
        <p className="page-subtitle">Add and manage services for your businesses</p>
      </div>

      {/* Business Picker */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label">Select Business</label>
            <select className="form-select" value={selectedBusiness}
              onChange={(e) => {
                                const id = e.target.value;
                                setSelectedBusiness(id);

                                if (id) {
                                  setSearchParams({ businessId: id });
                                } else {
                                  setSearchParams({});
                                }
                              }}>
              <option value="">Choose a business...</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
              ))}
            </select>
          </div>
          {businesses.length === 0 && (
            <button className="btn btn-primary" onClick={() => navigate('/my-businesses')}>
              + Create Business First
            </button>
          )}
        </div>
      </div>

      {selectedBusiness && (
        <>
          {success && <div className="alert alert-success">{success}</div>}

          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 className="section-title" style={{ flex: 1, marginBottom: 0 }}>
              Services ({services.length})
            </h2>
            <button className="btn btn-primary btn-sm"
              onClick={() => { setShowForm(!showForm); setError(''); }}>
              {showForm ? '✕ Cancel' : '+ Add Service'}
            </button>
          </div>

          {showForm && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '1rem' }}>New Service</h3>
              <form onSubmit={handleCreate}>
                {error && <div className="alert alert-error">{error}</div>}
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Service Name *</label>
                    <input className="form-input" placeholder="e.g. Haircut" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price (₹) *</label>
                    <input className="form-input" type="number" min="0" step="0.01" placeholder="500"
                      value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (minutes) *</label>
                    <input className="form-input" type="number" min="1" placeholder="e.g. 60"
                      value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input className="form-input" placeholder="Brief description (optional)"
                      value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Address / Location</label>
                    <input className="form-input" placeholder="e.g. 2nd Floor, Mall Road (optional)"
                      value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? '⏳ Adding...' : '+ Add Service'}
                </button>
              </form>
            </div>
          )}

          {loadingS ? (
            <Spinner />
          ) : services.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚙️</div>
              <h3>No services yet</h3>
              <p>Click "+ Add Service" to get started</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {services.map((s) => (
                <div key={s.id} className="owner-service-card">
                  <div className="owner-service-info">
                    <div className="owner-service-name">{s.name}</div>
                    <div className="owner-service-detail">
                      <span>⏱ {s.duration} min</span>
                      <span>💰 ₹{s.price}</span>
                      {s.address && <span>📍 {s.address}</span>}
                      {s.description && <span>📝 {s.description}</span>}
                    </div>
                  </div>
                  <div className="owner-service-actions">
                    <button className="btn btn-secondary btn-sm"
                      onClick={() => setEditingService(s)}>
                      ✏️ Edit
                    </button>
                    <button className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(s.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSaved={() => fetchServices(selectedBusiness)}
        />
      )}
    </div>
  );
}
