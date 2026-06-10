import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getMyBusinesses } from '../api/business';
import { getMyServices, createService, updateService, deleteService } from '../api/services';
import Spinner from '../components/Spinner';
import LocationFields from '../components/LocationFields';
import '../styles/owner.css';
import '../components/LocationFields.css';
import './ManageServices.css';

// ── Draft keys ───────────────────────────────────────────────────
const DRAFT_KEY      = 'manageServices_draft';
const EDIT_DRAFT_KEY = 'manageServices_editDraft';

// ── Session-storage helpers ──────────────────────────────────────
const saveDraft     = d  => { try { sessionStorage.setItem(DRAFT_KEY,      JSON.stringify(d));  } catch (_) {} };
const loadDraft     = () => { try { const d = sessionStorage.getItem(DRAFT_KEY);      return d ? JSON.parse(d) : null; } catch (_) { return null; } };
const clearDraft    = () => { try { sessionStorage.removeItem(DRAFT_KEY);      } catch (_) {} };
const saveEditDraft = d  => { try { sessionStorage.setItem(EDIT_DRAFT_KEY, JSON.stringify(d));  } catch (_) {} };
const loadEditDraft = () => { try { const d = sessionStorage.getItem(EDIT_DRAFT_KEY); return d ? JSON.parse(d) : null; } catch (_) { return null; } };
const clearEditDraft= () => { try { sessionStorage.removeItem(EDIT_DRAFT_KEY); } catch (_) {} };

// ── Constants ────────────────────────────────────────────────────
const EMPTY_LOC = { address: '', pincode: '', city: '', state: '', country: '' };
const emptyForm = {
  name: '', description: '', price: '',
  serviceType: 'FIXED', duration: '', gapMinutes: '',
  category: '',
  _catOpen: false,
  location:  { ...EMPTY_LOC },
  locations: [{ ...EMPTY_LOC }],
};
const CATEGORY_OPTIONS = [
  { val: 'HEALTH_WELLNESS',    icon: '🏥', label: 'Health & Wellness' },
  { val: 'DENTAL',             icon: '🦷', label: 'Dental' },
  { val: 'FITNESS_GYM',        icon: '🏋️', label: 'Fitness & Gym' },
  { val: 'SALON_BEAUTY',       icon: '💇', label: 'Salon & Beauty' },
  { val: 'SPA_MASSAGE',        icon: '💆', label: 'Spa & Massage' },
  { val: 'LEGAL',              icon: '⚖️', label: 'Legal' },
  { val: 'FINANCIAL',          icon: '💹', label: 'Financial' },
  { val: 'CONSULTING',         icon: '💼', label: 'Consulting' },
  { val: 'EDUCATION_TUTORING', icon: '📚', label: 'Education & Tutoring' },
  { val: 'CLEANING',           icon: '🧹', label: 'Cleaning' },
  { val: 'PLUMBING',           icon: '🔧', label: 'Plumbing' },
  { val: 'ELECTRICAL',         icon: '⚡', label: 'Electrical' },
  { val: 'CARPENTRY',          icon: '🪚', label: 'Carpentry' },
  { val: 'PEST_CONTROL',       icon: '🐜', label: 'Pest Control' },
  { val: 'PHOTOGRAPHY',        icon: '📷', label: 'Photography' },
  { val: 'CATERING',           icon: '🍽️', label: 'Catering' },
  { val: 'EVENTS',             icon: '🎉', label: 'Events' },
  { val: 'TRAVEL',             icon: '✈️', label: 'Travel' },
  { val: 'GROCERY',            icon: '🛒', label: 'Grocery' },
  { val: 'PHARMACY',           icon: '💊', label: 'Pharmacy' },
  { val: 'OTHER',              icon: '⚙️', label: 'Other' },
];

// ── Lazy-init helpers — read sessionStorage ONCE at component boot ─
// This fixes the "dialog disappears on refresh" bug:
// useState(fn) calls fn synchronously before the first render,
// so the form is open/populated from frame 0 — no flicker, no blank flash.
const initFromDraft = (urlBizId) => {
  const draft = loadDraft();
  if (!draft) return { form: emptyForm, showForm: false, bulkMode: false, selectedBusiness: urlBizId || '' };
  return {
    form:             draft.form     ?? emptyForm,
    showForm:         draft.showForm ?? false,
    bulkMode:         draft.bulkMode ?? false,
    selectedBusiness: urlBizId || draft.selectedBusiness || '',
  };
};

// ── Service Type Toggle ──────────────────────────────────────────
function ServiceTypeToggle({ value, onChange }) {
  return (
    <div className="ms-type-toggle">
      {[
        { val: 'FIXED',        icon: '⏱', label: 'Fixed Appointment', desc: 'Fixed duration (e.g. Haircut 30 min)' },
        { val: 'CONSULTATION', icon: '💬', label: 'Open Consultation',  desc: 'Flexible — set gap between slots' },
      ].map(opt => (
        <div key={opt.val}
          className={`ms-type-card ${value === opt.val ? 'ms-type-active' : ''}`}
          onClick={() => onChange(opt.val)}>
          <div className="ms-type-icon">{opt.icon}</div>
          <div>
            <div className="ms-type-label">{opt.label}</div>
            <div className="ms-type-desc">{opt.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Service form (shared by create + edit) ───────────────────────
function ServiceForm({
  form, setForm, onSubmit, submitting,
  submitLabel, onCancel, showBulk,
  cancelLabel, locationRef,
  fieldErrors = {},       
  clearFieldError = () => {} 
}) {
  return (
    <form onSubmit={onSubmit} noValidate>  
      <div className="grid grid-2">

        <div className="form-group">
          <label className="form-label">Service Name *</label>
          <input
            className={`form-input ${fieldErrors.name ? 'ms-input-error' : ''}`}
            placeholder="e.g. Haircut"
            name="serviceName"
            value={form.name}
            onChange={e => {
              setForm({ ...form, name: e.target.value });
              clearFieldError('name');
            }}
          />
          {fieldErrors.name && (
            <div className="ms-field-error">⚠ {fieldErrors.name}</div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Price (₹) *</label>
          <input
            className={`form-input ${fieldErrors.price ? 'ms-input-error' : ''}`}
            type="number"
            placeholder="500"
            step="any"
            name="servicePrice"
            value={form.price}
            onChange={e => {
              setForm({ ...form, price: e.target.value });
              clearFieldError('price');
            }}
          />
          {fieldErrors.price && (
            <div className="ms-field-error">⚠ {fieldErrors.price}</div>
          )}
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Description</label>
          <input
            className="form-input"
            placeholder="Brief description (optional)"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Category</label>
          <div className={`ms-cat-dropdown ${form._catOpen ? 'ms-cat-open' : ''}`}>
            <button
              type="button"
              className="ms-cat-trigger"
              onClick={() => setForm({ ...form, _catOpen: !form._catOpen })}
            >
              {(() => {
                const selected = CATEGORY_OPTIONS.find(o => o.val === form.category);
                return selected
                  ? <><span>{selected.icon}</span><span>{selected.label}</span></>
                  : <span className="ms-cat-placeholder">Select category…</span>;
              })()}
              <span className="ms-cat-arrow">{form._catOpen ? '▲' : '▼'}</span>
            </button>
            {form._catOpen && (
              <div className="ms-cat-menu">
                {CATEGORY_OPTIONS.map(opt => (
                  <div
                    key={opt.val}
                    className={`ms-cat-option ${form.category === opt.val ? 'selected' : ''}`}
                    onClick={() => {
                      setForm({ ...form, category: opt.val, _catOpen: false });
                    }}
                  >
                    <span className="ms-cat-option-icon">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Service Type *</label>
        <ServiceTypeToggle
          value={form.serviceType}
          onChange={val => { 
                    setForm({ ...form, serviceType: val, duration: '' });
                    clearFieldError('duration');
                    clearFieldError('gapMinutes');}}
          />
      </div>

      <div className="grid grid-2">
        {form.serviceType === 'FIXED' && (
          <div className="form-group">
            <label className="form-label">Duration (minutes) *</label>
            <input
              className={`form-input ${fieldErrors.duration ? 'ms-input-error' : ''}`}
              type="number"
              step="any"
              placeholder="e.g. 45"
              name="serviceDuration"
              value={form.duration}
              onChange={e => {
                setForm({ ...form, duration: e.target.value });
                clearFieldError('duration');
              }}
            />
            {fieldErrors.duration && (
              <div className="ms-field-error">⚠ {fieldErrors.duration}</div>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">
            Gap Between Appointments (min)
            {form.serviceType === 'FIXED'
              ? <span className="ms-optional"> optional</span>
              : <span> *</span>  // required for CONSULTATION
            }
          </label>
          <input
            className={`form-input ${fieldErrors.gapMinutes ? 'ms-input-error' : ''}`}
            type="number"
            step="any"
            placeholder="e.g. 15"
            value={form.gapMinutes}
            onChange={e => {
              setForm({ ...form, gapMinutes: e.target.value });
              clearFieldError('gapMinutes');
            }}
          />
          <span className="form-hint">
            {form.serviceType === 'CONSULTATION'
              ? 'Defines the interval between consultation slots'
              : 'Buffer/cleanup time after each booking'}
          </span>
          {fieldErrors.gapMinutes && (
            <div className="ms-field-error">⚠ {fieldErrors.gapMinutes}</div>
          )}
        </div>
      </div>

      {/* Location */}
      {showBulk ? (
        <div className="ms-bulk-locations">
          <div className="ms-bulk-label">
            📍 Service Locations
            <span className="ms-bulk-hint">
              {' '}— a separate service entry is created for each location
            </span>
          </div>
          {form.locations.map((loc, i) => (
            <div key={i} className="ms-bulk-loc-row card">
              <div className="ms-bulk-loc-header">
                <span className="ms-bulk-loc-index">Location {i + 1}</span>
                {form.locations.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setForm({
                      ...form,
                      locations: form.locations.filter((_, idx) => idx !== i)
                    })}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
              <LocationFields
                values={loc}
                onChange={val => setForm({
                  ...form,
                  locations: form.locations.map((l, idx) => idx === i ? val : l)
                })}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn btn-outline btn-sm ms-add-loc-btn"
            onClick={() => setForm({
              ...form, locations: [...form.locations, { ...EMPTY_LOC }]
            })}
          >
            + Add Another Location
          </button>
        </div>
      ) : (
        <LocationFields
          ref={locationRef}
          values={form.location}
          onChange={val => setForm({ ...form, location: val })}
        />
      )}

      <div className="ms-form-footer">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel || 'Cancel'}
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? '⏳ Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ── Edit Modal ───────────────────────────────────────────────────
function EditServiceModal({ service, onClose, onSaved }) {
  const buildForm = (svc) => ({
    name:        svc.name        || '',
    description: svc.description || '',
    price:       svc.price       ?? '',
    serviceType: svc.serviceType || 'FIXED',
    duration:    svc.duration    ?? '',
    gapMinutes:  svc.gapMinutes  ?? '',
    category:    svc.category    || '',
    _catOpen: false,
    location: {
      address: svc.address || '',
      pincode: svc.pincode || '',
      city:    svc.city    || '',
      state:   svc.state   || '',
      country: svc.country || '',
    },
    _serviceId: svc.id,
  });

  const [form, setForm] = useState(() => {
    // Only restore draft if it's for the same service AND was saved 
    // less than 30 minutes ago (prevents stale drafts causing confusion)
    const draft = loadEditDraft();
    if (
      draft &&
      draft._serviceId === service.id &&
      draft._savedAt &&
      Date.now() - draft._savedAt < 30 * 60 * 1000  // 30 min expiry
    ) {
      return draft;
    }
    // No valid draft — start fresh from the actual service data
    clearEditDraft();
    return buildForm(service);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    saveEditDraft({ ...form, _serviceId: service.id, _savedAt: Date.now() });
  }, [form]);

  const handleClose = () => { clearEditDraft(); onClose(); };

  const editLocationRef = useRef(null);
  const [fieldErrors, setFieldErrors] = useState({});  // ← add

  const clearFieldError = (f) =>
    setFieldErrors(prev => ({ ...prev, [f]: '' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errs = {};
    if (!form.name.trim())
      errs.name = 'Service name is required';
    if (!form.price)
      errs.price = 'Price is required';
    else if (parseFloat(form.price) <= 0)
      errs.price = 'Enter a valid price greater than 0';
    if (form.serviceType === 'FIXED') {
      if (!form.duration)
        errs.duration = 'Duration is required for fixed appointments';
      else if (parseInt(form.duration) <= 0)
        errs.duration = 'Enter a valid duration greater than 0';
    } else {
      if (!form.gapMinutes)
        errs.gapMinutes = 'Gap between appointments is required for consultations';
      else if (parseInt(form.gapMinutes) <= 0)
        errs.gapMinutes = 'Enter a valid gap greater than 0';
    }

    setFieldErrors(errs);

    let locationValid = true;
    if (editLocationRef.current) {
      locationValid = editLocationRef.current.validate();
    }

    if (Object.keys(errs).length > 0 || !locationValid) return;

    setSaving(true);
    try {
      await updateService(service.id, {
        name:        form.name.trim(),
        description: form.description.trim() || undefined,
        price:       parseFloat(form.price),
        serviceType: form.serviceType,
        duration:    form.duration !== '' ? parseInt(form.duration)     : null,
        gapMinutes:  form.gapMinutes !== '' ? parseInt(form.gapMinutes) : null,
        category:    form.category || 'OTHER',
        ...form.location,
      });
      clearEditDraft();
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="owner-modal-overlay"
         onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="owner-modal ms-modal">
        <div className="owner-modal-header">
          <span className="owner-modal-title">✏️ Edit Service</span>
          <button className="owner-modal-close" onClick={handleClose}>✕</button>
        </div>
        <div className="ms-modal-body">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 14 }}>
              {error}
            </div>
          )}
          <ServiceForm
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            submitting={saving}
            submitLabel="✓ Save Changes"
            showBulk={false}
            onCancel={handleClose}
            cancelLabel="✕ Discard changes"
            locationRef={editLocationRef}
            fieldErrors={fieldErrors}        
            clearFieldError={clearFieldError} 
          />
        </div>
      </div>
    </div>
  );
}

function DeleteServiceModal({ service, onConfirm, onClose, loading }) {
  return (
    <div className="owner-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="owner-modal ms-delete-modal">
        <div className="ms-delete-icon">🗑️</div>
        <h3 className="ms-delete-title">Delete Service?</h3>
        <p className="ms-delete-body">
          You're about to permanently delete{' '}
          <strong>"{service.name}"</strong>.
          {service.city && <> It is listed in <strong>{[service.city, service.state].filter(Boolean).join(', ')}</strong>.</>}
          {' '}This cannot be undone.
        </p>
        <div className="ms-delete-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Keep It
          </button>
          <button className="btn btn-danger ms-delete-confirm-btn" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : '🗑️ Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Service Card ─────────────────────────────────────────────────
function ServiceCard({ s, onEdit, onDelete }) {
  const typeLabel      = s.serviceType === 'CONSULTATION' ? 'Consultation' : 'Fixed';
  const typeBadgeClass = s.serviceType === 'CONSULTATION' ? 'ms-badge-consult' : 'ms-badge-fixed';

  return (
    <div className="ms-service-card">
      {/* Row 1 — name + type badge + action buttons */}
      <div className="ms-sc-header">
        <div className="ms-sc-name-row">
          <span className="ms-sc-name">{s.name}</span>
        </div>
        <div className="ms-sc-actions">
          <button className="btn btn-secondary btn-sm ms-sc-btn-edit" onClick={() => onEdit(s)}>
            ✏️ Edit
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(s)}>
            🗑 Delete
          </button>
        </div>
      </div>

      {/* Row 2 — detail chips */}
      <div className="ms-sc-chips">
        {/* Service type chip */}
        <div className={`ms-sc-chip ms-sc-chip--type ${s.serviceType === 'CONSULTATION' ? 'ms-sc-chip--consult' : 'ms-sc-chip--fixed'}`}>
          <span className="ms-sc-chip-icon">{s.serviceType === 'CONSULTATION' ? '💬' : '⏱'}</span>
          <div className="ms-sc-chip-body">
            <span className="ms-sc-chip-label">Type</span>
            <span className="ms-sc-chip-value">{s.serviceType === 'CONSULTATION' ? 'Consultation' : 'Fixed'}</span>
          </div>
        </div>
        {s.duration > 0 && (
          <div className="ms-sc-chip">
            <span className="ms-sc-chip-icon">⏱</span>
            <div className="ms-sc-chip-body">
              <span className="ms-sc-chip-label">Duration</span>
              <span className="ms-sc-chip-value">{s.duration} min</span>
            </div>
          </div>
        )}
        {s.category &&(
          <div className="ms-sc-chip">
            <span className="ms-sc-chip-icon">🏷️</span>
            <div className="ms-sc-chip-body">
              <span className="ms-sc-chip-label">Category</span>
              <span className="ms-sc-chip-value">{s.category}</span>
            </div>
          </div>
        )}
        {s.price != null && (
          <div className="ms-sc-chip ms-sc-chip--price">
            <span className="ms-sc-chip-icon">💰</span>
            <div className="ms-sc-chip-body">
              <span className="ms-sc-chip-label">Price</span>
              <span className="ms-sc-chip-value">₹{s.price}</span>
            </div>
          </div>
        )}
        {s.gapMinutes > 0 && (
          <div className="ms-sc-chip">
            <span className="ms-sc-chip-icon">⏸</span>
            <div className="ms-sc-chip-body">
              <span className="ms-sc-chip-label">Gap</span>
              <span className="ms-sc-chip-value">{s.gapMinutes} min</span>
            </div>
          </div>
        )}
        {s.city && (
          <div className="ms-sc-chip">
            <span className="ms-sc-chip-icon">📍</span>
            <div className="ms-sc-chip-body">
              <span className="ms-sc-chip-label">Location</span>
              <span className="ms-sc-chip-value">{[s.city, s.state].filter(Boolean).join(', ')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Row 3 — description */}
      {s.description && (
        <p className="ms-sc-desc">
          <span className="ms-sc-desc-label">About: </span>
          {s.description}
        </p>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function ManageServices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate   = useNavigate();
  const urlBizId   = searchParams.get('businessId') || '';
  const createLocationRef = useRef(null);
  const [formErrors, setFormErrors] = useState({});

  // ── All state initialised LAZILY from sessionStorage ─────────────
  // This is the key fix: useState(() => fn()) runs fn synchronously,
  // so on a page refresh the form is already open from frame 0.
  const [form,             setForm]             = useState(() => initFromDraft(urlBizId).form);
  const [showForm,         setShowForm]         = useState(() => initFromDraft(urlBizId).showForm);
  const [bulkMode,         setBulkMode]         = useState(() => initFromDraft(urlBizId).bulkMode);
  const [selectedBusiness, setSelectedBusiness] = useState(() => initFromDraft(urlBizId).selectedBusiness);

  const [businesses,     setBusinesses]     = useState([]);
  const [services,       setServices]       = useState([]);
  const [loadingB,       setLoadingB]       = useState(true);
  const [loadingS,       setLoadingS]       = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState('');
  const [success,        setSuccess]        = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Persist draft on every relevant state change ─────────────────
  useEffect(() => {
    saveDraft({ form, showForm, bulkMode, selectedBusiness });
  }, [form, showForm, bulkMode, selectedBusiness]);

  // ── Load approved businesses ─────────────────────────────────────
  useEffect(() => {
    getMyBusinesses()
      .then(r => {
        const approved = (r.data || []).filter(b => (b.status || '').toUpperCase() === 'APPROVED');
        setBusinesses(approved);
        setSelectedBusiness(prev =>
          prev && !approved.some(b => String(b.id) === String(prev)) ? '' : prev
        );
      })
      .catch(() => {})
      .finally(() => setLoadingB(false));
  }, []);

  const fetchServices = id => {
    setLoadingS(true);
    getMyServices(id)
      .then(r => setServices(Array.isArray(r.data) ? r.data : []))
      .catch(() => setServices([]))
      .finally(() => setLoadingS(false));
  };

  useEffect(() => { if (selectedBusiness) fetchServices(selectedBusiness); }, [selectedBusiness]);

  const showMsg = (text, type = 'success') => {
    if (type === 'success') { setSuccess(text); setTimeout(() => setSuccess(''), 4000); setError(''); }
    else setError(text);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setBulkMode(false);
    setError('');
    setFormErrors({});
    // Persist closed state so next refresh doesn't re-open
    saveDraft({ form: emptyForm, showForm: false, bulkMode: false, selectedBusiness });
  };

  const handleCreate = async e => {
    e.preventDefault();
    setError('');

    // ── Validate all fields, collect all errors at once ───────────
    const errs = {};
    if (!form.name.trim())
      errs.name = 'Service name is required';
    if (!form.price)
      errs.price = 'Price is required';
    else if (isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0)
      errs.price = 'Enter a valid price greater than 0';
    if (form.serviceType === 'FIXED') {
      if (!form.duration)
        errs.duration = 'Duration is required for fixed appointments';
      else if (isNaN(parseInt(form.duration)) || parseInt(form.duration) <= 0)
        errs.duration = 'Enter a valid duration greater than 0';
    } else {
      if (!form.gapMinutes)
        errs.gapMinutes = 'Gap between appointments is required for consultations';
      else if (isNaN(parseInt(form.gapMinutes)) || parseInt(form.gapMinutes) <= 0)
        errs.gapMinutes = 'Enter a valid gap greater than 0';
    }

    setFormErrors(errs);

    // ── Validate location via ref ─────────────────────────────────
    let locationValid = true;
    if (!bulkMode && createLocationRef.current) {
      locationValid = createLocationRef.current.validate();
    }

    if (Object.keys(errs).length > 0 || !locationValid) {
      // Focus the first invalid field so user knows where to look
      if (errs.name)     document.querySelector('[name="serviceName"]')?.focus();
      else if (errs.price)    document.querySelector('[name="servicePrice"]')?.focus();
      else if (errs.duration) document.querySelector('[name="serviceDuration"]')?.focus();
      return;
    }

    // ── All valid — submit ────────────────────────────────────────
    const base = {
      businessId:  parseInt(selectedBusiness),
      name:        form.name.trim(),
      description: form.description.trim() || undefined,
      price:       parseFloat(form.price),
      serviceType: form.serviceType,
      duration:    form.serviceType === 'FIXED' ? parseInt(form.duration) : null,
      gapMinutes:  parseInt(form.gapMinutes) || 0,
      category:    form.category || 'OTHER',
    };

    setSubmitting(true);
    try {
      if (bulkMode && form.locations.length > 1) {
        await Promise.all(
          form.locations.map(loc => createService({ ...base, ...loc }))
        );
        showMsg(`✓ ${form.locations.length} service locations added!`);
      } else {
        const loc = bulkMode ? form.locations[0] : form.location;
        await createService({ ...base, ...loc });
        showMsg('✓ Service added successfully!');
      }
      setFormErrors({});
      resetForm();
      fetchServices(selectedBusiness);
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create service', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteService(deleteTarget.id);
      setServices(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loadingB) return <div className="page-container"><Spinner /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Manage Services</h1>
        <p className="page-subtitle">Add and manage services for your businesses</p>
      </div>

      {/* Business picker */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label">Select Business</label>
            <select className="form-select" value={selectedBusiness}
              onChange={e => {
                const id = e.target.value;
                setSelectedBusiness(id);
                setSearchParams(id ? { businessId: id } : {});
              }}>
              <option value="">Choose a business...</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          {businesses.length === 0 && (
            <button className="btn btn-primary" onClick={() => navigate('/my-businesses')}>
              + Register Business
            </button>
          )}
        </div>
      </div>

      {selectedBusiness && (
        <>
          {success && <div className="alert alert-success">{success}</div>}
          {error   && <div className="alert alert-error">{error}</div>}

          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2 className="section-title" style={{ flex: 1, marginBottom: 0 }}>
              Services ({services.length})
            </h2>
            {!showForm && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm"
                  onClick={() => { setBulkMode(true); setShowForm(true); setError(''); setForm(emptyForm); }}>
                  📋 Add Multiple Locations
                </button>
                <button className="btn btn-primary btn-sm"
                  onClick={() => { setBulkMode(false); setShowForm(true); setError(''); setForm(emptyForm); }}>
                  + Add Service
                </button>
              </div>
            )}
          </div>

          {showForm && (
            <div className="card ms-form-card" style={{ marginBottom: 20 }}>
              <div className="ms-form-header">
                <div className="ms-form-header-top">
                  <h3 className="ms-form-title">
                    {bulkMode ? '📋 Add Service — Multiple Locations' : '⚙️ New Service'}
                  </h3>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm}>
                    ✕ Cancel &amp; Discard
                  </button>
                </div>

                {/* Context note for bulk mode */}
                {bulkMode && (
                  <div className="ms-bulk-info">
                    Fill in the service details once, then add as many locations as you need.
                    A separate service entry will be created for each location.
                  </div>
                )}

                {/* Cancel context note */}
                <div className="ms-cancel-hint">
                  {bulkMode
                    ? '💡 Clicking "Cancel & Discard" will close this form and discard all locations you\'ve added. Your service won\'t be saved.'
                    : '💡 Clicking "Cancel & Discard" will close this form without saving the service.'}
                </div>
              </div>

              <ServiceForm form={form} setForm={setForm}
                onSubmit={handleCreate} submitting={submitting}
                submitLabel={bulkMode
                  ? `+ Add ${form.locations?.length || 1} Service${(form.locations?.length || 1) > 1 ? 's' : ''}`
                  : '+ Add Service'}
                showBulk={bulkMode}
                locationRef={createLocationRef}
                fieldErrors={formErrors}                           
                clearFieldError={(f) =>                            
                  setFormErrors(prev => ({ ...prev, [f]: '' }))} />
            </div>
          )}

          {loadingS ? <Spinner /> : services.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚙️</div>
              <h3>No services yet</h3>
              <p>Click "+ Add Service" to get started</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {services.map(s => (
                <ServiceCard key={s.id} s={s}
                  onEdit={setEditingService}
                  onDelete={setDeleteTarget} />
              ))}
            </div>
          )}
        </>
      )}

      {editingService && (
        <EditServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSaved={() => fetchServices(selectedBusiness)}
        />
      )}

      {deleteTarget && (
        <DeleteServiceModal
          service={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}