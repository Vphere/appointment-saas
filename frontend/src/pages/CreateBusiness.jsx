import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBusiness } from '../api/business';
import { uploadDocument } from '../api/documents';
import './CreateBusiness.css';

// ── Constants ────────────────────────────────────────────────────
const CATEGORIES = [
  'Salon & Beauty', 'Spa & Wellness', 'Fitness & Gym', 'Healthcare & Clinic',
  'Dental', 'Legal Services', 'Financial Advisory', 'Education & Tutoring',
  'Photography', 'Event Management', 'Catering', 'Home Services',
  'Auto Services', 'Pet Care', 'Yoga & Meditation', 'Other',
];

const BUSINESS_TYPES = [
  { value: 'SOLE_PROPRIETOR',  label: 'Sole Proprietor',    desc: 'Single owner, no formal registration needed' },
  { value: 'PARTNERSHIP',      label: 'Partnership',         desc: 'Two or more partners sharing business' },
  { value: 'PRIVATE_LIMITED',  label: 'Private Limited',     desc: 'Pvt. Ltd. company registered with MCA' },
  { value: 'LLP',              label: 'LLP',                 desc: 'Limited Liability Partnership' },
  { value: 'OTHER',            label: 'Other',               desc: 'Any other business structure' },
];

const MANDATORY_DOCS = [
  { type: 'PAN_CARD', label: 'PAN Card', desc: 'Business or proprietor PAN card copy', required: true },
];

const OPTIONAL_DOCS = [
  { type: 'SHOP_ESTABLISHMENT_LICENSE', label: 'Shop & Establishment License', desc: 'Local municipal license' },
  { type: 'TRADE_LICENSE',              label: 'Trade License',                 desc: 'Issued by local government body' },
  { type: 'INCORPORATION_CERTIFICATE',  label: 'Incorporation Certificate',     desc: 'MCA certificate for Pvt. Ltd. / LLP' },
  { type: 'UDYAM_CERTIFICATE',          label: 'Udyam / MSME Certificate',      desc: 'MSME registration certificate' },
];

// GST threshold: 20 Lakhs for service businesses in India
const GST_THRESHOLD = 2_000_000;

const STEPS = ['Basic Info', 'Verification', 'Documents'];

const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE_MB = 10;

// Storage key for draft persistence
const DRAFT_KEY = 'createBusiness_draft';

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Format a raw number (string or number) as INR shorthand.
 * Uses parseFloat so decimal inputs work correctly.
 */
const formatINR = (val) => {
  // Trim trailing dots / incomplete decimals before parsing
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (!n || isNaN(n)) return '';
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2).replace(/\.?0+$/, '')} L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(2).replace(/\.?0+$/, '')} K`;
  return `₹${n}`;
};

/**
 * Validate Udyam registration number format: UDYAM-XX-YY-XXXXXXX
 */
const validateUdyam = (val) => {
  if (!val || !val.trim()) return null; // optional field
  const pattern = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/i;
  if (!pattern.test(val.trim().toUpperCase()))
    return 'Invalid Udyam format. Expected: UDYAM-XX-00-0000000 (e.g. UDYAM-MH-03-0001234)';
  return null;
};

/**
 * Validate a file for type and size.
 * Returns an error string or null.
 */
const validateFile = (file) => {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(`.${ext}`))
      return `Unsupported file type "${file.name}". Please upload PDF, JPG, or PNG.`;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
    return `File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`;
  return null;
};

function StepIndicator({ current, total, labels }) {
  return (
    <div className="cb-steps">
      {labels.map((label, i) => (
        <div key={i} className={`cb-step ${i < current ? 'cb-step-done' : i === current ? 'cb-step-active' : ''}`}>
          <div className="cb-step-circle">
            {i < current ? '✓' : i + 1}
          </div>
          <div className="cb-step-label">{label}</div>
          {i < total - 1 && <div className="cb-step-line" />}
        </div>
      ))}
    </div>
  );
}

function CategoryInput({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const matches = CATEGORIES.filter(c => c.toLowerCase().includes(query.toLowerCase()) && c !== query);

  // Sync if parent value changes (e.g. from draft restore)
  useEffect(() => { setQuery(value || ''); }, [value]);

  const select = (cat) => {
    setQuery(cat);
    onChange(cat);
    setOpen(false);
  };

  return (
    <div className="cb-cat-wrap">
      <input
        className="form-input"
        placeholder="e.g. Salon & Beauty"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
      />
      {open && matches.length > 0 && (
        <div className="cb-cat-dropdown">
          {matches.map(c => (
            <div key={c} className="cb-cat-option" onMouseDown={() => select(c)}>{c}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocUploadRow({ doc, uploaded, onUpload, onRemove, fieldError }) {
  const ref = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      alert(err); // immediate feedback for file type/size issues
      e.target.value = '';
      return;
    }
    onUpload(file);
  };

  return (
    <div className={`cb-doc-row ${uploaded ? 'cb-doc-uploaded' : ''} ${fieldError ? 'cb-doc-error' : ''}`}>
      <div className="cb-doc-info">
        <div className="cb-doc-name">
          {doc.label}
          {doc.required && <span className="cb-required">*</span>}
        </div>
        <div className="cb-doc-desc">{doc.desc}</div>
        {uploaded && <div className="cb-doc-filename">📎 {uploaded.name}</div>}
        {fieldError && <div className="cb-doc-field-error">⚠ {fieldError}</div>}
      </div>
      <div className="cb-doc-actions">
        {uploaded ? (
          <>
            <span className="cb-doc-ok">✓ Uploaded</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onRemove}>✕ Remove</button>
          </>
        ) : (
          <>
            <input type="file" ref={ref} style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
              onChange={handleFileChange} />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => ref.current.click()}>
              ↑ Upload
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Field-level error display ─────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="cb-field-error">⚠ {msg}</div>;
}

// ── Lazy draft reader — runs synchronously before first render ────
// Using useEffect to restore draft causes a flicker: the component
// renders once with empty fields, then useEffect fires and sets state,
// causing a second render with the restored values. Users see blank
// fields for a split second, and on fast navigation the form may
// appear empty before data loads.
// useState(() => fn()) runs fn synchronously at construction time,
// so the correct values are in state from frame 0 — no flicker, no
// blank flash, works on page refresh AND on back-navigation.
const readDraft = () => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
};

// ── Main component ────────────────────────────────────────────────
export default function CreateBusiness({ onSuccess, onCancel }) {
  const navigate = useNavigate();

  // Global error (top of form) and field-level errors map
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // ── All state lazily initialised from sessionStorage ─────────────
  const [step, setStep] = useState(() => {
    const d = readDraft();
    return typeof d?.savedStep === 'number' ? d.savedStep : 0;
  });

  const [basic, setBasic] = useState(() => {
    const d = readDraft();
    return d?.savedBasic ?? { name: '', description: '', phone: '', category: '', businessType: '' };
  });

  const [verify, setVerify] = useState(() => {
    const d = readDraft();
    return d?.savedVerify ?? { panNumber: '', annualTurnover: '', gstNumber: '', udyamNumber: '' };
  });

  const [submitting, setSubmitting] = useState(false);

  // Step 3 — Documents cannot be serialised to sessionStorage (File objects)
  const [documents, setDocuments] = useState({});

  const gstRequired = Number(verify.annualTurnover) > GST_THRESHOLD;

  // Save draft whenever basic/verify/step change
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        savedBasic: basic,
        savedVerify: verify,
        savedStep: step,
      }));
    } catch (_) { /* ignore quota errors */ }
  }, [basic, verify, step]);

  const clearDraft = () => {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {}
  };

  // ── Validation ───────────────────────────────────────────────
  const validateStep0 = () => {
    const errs = {};
    if (!basic.name.trim())         errs.name = 'Business name is required';
    if (!basic.businessType)        errs.businessType = 'Please select a business type';
    if (!basic.phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-]{7,15}$/.test(basic.phone.trim())) {
      errs.phone = 'Enter a valid phone number (7–15 digits)';
    }
    if (!basic.category.trim())     errs.category = 'Category is required';
    return errs;
  };

  const validateStep1 = () => {
    const errs = {};
    if (!verify.panNumber.trim()) {
      errs.panNumber = 'PAN number is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(verify.panNumber.trim().toUpperCase())) {
      errs.panNumber = 'Invalid PAN format (e.g. ABCDE1234F)';
    }
    if (!verify.annualTurnover) {
      errs.annualTurnover = 'Please enter approximate annual turnover';
    }
    const udyamErr = validateUdyam(verify.udyamNumber);
    if (udyamErr) errs.udyamNumber = udyamErr;

    if (gstRequired && !verify.gstNumber.trim()) {
      errs.gstNumber = 'GST number is required for turnover above ₹20 Lakhs';
    } else if (verify.gstNumber.trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(verify.gstNumber.trim().toUpperCase())) {
      errs.gstNumber = 'Invalid GST number format (e.g. 22ABCDE1234F1Z5)';
    }
    return errs;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!documents['PAN_CARD'])        errs.PAN_CARD = 'PAN Card document is required';
    if (gstRequired && !documents['GST_CERTIFICATE']) errs.GST_CERTIFICATE = 'GST Certificate is required for turnover above ₹20 Lakhs';
    return errs;
  };

  const nextStep = () => {
    setError('');
    const errs = step === 0 ? validateStep0() : step === 1 ? validateStep1() : {};
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError('Please enter required details before going to next page.');
      return;
    }
    setFieldErrors({});
    setStep(s => s + 1);
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    const errs = validateStep2();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError('Please upload all required documents before submitting.');
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await createBusiness({
        name:            basic.name.trim(),
        description:     basic.description.trim() || undefined,
        phone:           basic.phone.trim(),
        category:        basic.category.trim(),
        businessType:    basic.businessType,
        panNumber:       verify.panNumber.trim().toUpperCase(),
        annualTurnover:  Number(verify.annualTurnover),
        gstNumber:       verify.gstNumber.trim().toUpperCase() || undefined,
        udyamNumber:     verify.udyamNumber.trim() || undefined,
      });

      const businessId = res.data.id;

      await Promise.all(
        Object.entries(documents).map(([type, file]) =>
          uploadDocument(businessId, type, file)
        )
      );

      clearDraft();
      if (onSuccess) onSuccess();
      else navigate('/my-businesses');

    } catch (err) {
      // Try to show field-specific errors from the API response
      const apiData = err.response?.data;
      if (apiData?.errors && typeof apiData.errors === 'object') {
        // Server returned field-level errors like { panNumber: "Already registered" }
        setFieldErrors(apiData.errors);
        // Map field to step so user knows where to go
        const step0Fields = ['name', 'phone', 'category', 'businessType', 'description'];
        const step1Fields = ['panNumber', 'annualTurnover', 'gstNumber', 'udyamNumber'];
        const errFields = Object.keys(apiData.errors);
        const failStep = errFields.some(f => step0Fields.includes(f)) ? 0
          : errFields.some(f => step1Fields.includes(f)) ? 1 : 2;
        setError(
          apiData.message
            ? `${apiData.message} — see highlighted fields ${failStep < step ? `(go back to Step ${failStep + 1})` : ''}`
            : 'Some fields have errors. Please review and correct them.'
        );
      } else {
        setError(apiData?.message || 'Failed to register business. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cb-root">
      <div className="cb-header">
        <h2 className="cb-title">Register New Business</h2>
        <p className="cb-sub">Submit your business for admin verification. Once approved, you can add branches and services.</p>
      </div>

      <StepIndicator current={step} total={STEPS.length} labels={STEPS} />

      {error && <div className="alert alert-error cb-global-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Step 0: Basic Info ── */}
      {step === 0 && (
        <div className="cb-section">
          <div className="cb-section-title">Business Information</div>

          <div className="grid grid-2">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Business Name *</label>
              <input
                className={`form-input ${fieldErrors.name ? 'input-error' : ''}`}
                placeholder="e.g. Elite Skin Care"
                value={basic.name}
                onChange={e => { setBasic({ ...basic, name: e.target.value }); setFieldErrors(p => ({ ...p, name: '' })); }}
              />
              <FieldError msg={fieldErrors.name} />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <div className={fieldErrors.category ? 'input-error-wrap' : ''}>
                <CategoryInput value={basic.category} onChange={val => { setBasic({ ...basic, category: val }); setFieldErrors(p => ({ ...p, category: '' })); }} />
              </div>
              <FieldError msg={fieldErrors.category} />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                className={`form-input ${fieldErrors.phone ? 'input-error' : ''}`}
                placeholder="+91 98765 43210"
                value={basic.phone}
                maxLength={15}
                onChange={e => {
                  // Allow only digits, +, spaces, hyphens
                  const raw = e.target.value.replace(/[^\d+\s\-]/g, '');
                  setBasic({ ...basic, phone: raw });
                  setFieldErrors(p => ({ ...p, phone: '' }));
                }}
              />
              <span className="form-hint">Enter with country code, e.g. +91 98765 43210</span>
              <FieldError msg={fieldErrors.phone} />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3}
                placeholder="Tell customers what your business does..."
                value={basic.description}
                onChange={e => setBasic({ ...basic, description: e.target.value })} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label">Business Type *</label>
            <div className="cb-type-grid">
              {BUSINESS_TYPES.map(bt => (
                <div key={bt.value}
                  className={`cb-type-card ${basic.businessType === bt.value ? 'cb-type-selected' : ''} ${fieldErrors.businessType ? 'cb-type-error' : ''}`}
                  onClick={() => { setBasic({ ...basic, businessType: bt.value }); setFieldErrors(p => ({ ...p, businessType: '' })); }}>
                  <div className="cb-type-label">{bt.label}</div>
                  <div className="cb-type-desc">{bt.desc}</div>
                </div>
              ))}
            </div>
            <FieldError msg={fieldErrors.businessType} />
          </div>
        </div>
      )}

      {/* ── Step 1: Verification ── */}
      {step === 1 && (
        <div className="cb-section">
          <div className="cb-section-title">Business Verification</div>
          <div className="cb-info-banner">
            ℹ️ This information is used by admin to verify your business is genuine. It will not be shown to customers.
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">PAN Number *</label>
              <input
                className={`form-input cb-mono ${fieldErrors.panNumber ? 'input-error' : ''}`}
                placeholder="ABCDE1234F"
                maxLength={10} style={{ textTransform: 'uppercase' }}
                value={verify.panNumber}
                onChange={e => { setVerify({ ...verify, panNumber: e.target.value.toUpperCase() }); setFieldErrors(p => ({ ...p, panNumber: '' })); }}
              />
              <span className="form-hint">Proprietor or business PAN</span>
              <FieldError msg={fieldErrors.panNumber} />
            </div>

            <div className="form-group">
              <label className="form-label">Udyam / MSME Number <span className="cb-optional">(optional)</span></label>
              <input
                className={`form-input cb-mono ${fieldErrors.udyamNumber ? 'input-error' : ''}`}
                placeholder="UDYAM-MH-03-0001234"
                value={verify.udyamNumber}
                onChange={e => { setVerify({ ...verify, udyamNumber: e.target.value.toUpperCase() }); setFieldErrors(p => ({ ...p, udyamNumber: '' })); }}
              />
              <span className="form-hint">Format: UDYAM-XX-00-0000000</span>
              <FieldError msg={fieldErrors.udyamNumber} />
            </div>

            {/* Annual turnover */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                Approximate Annual Turnover *
                {verify.annualTurnover && !isNaN(Number(verify.annualTurnover)) && (
                  <span className="cb-turnover-display">{formatINR(verify.annualTurnover)}</span>
                )}
              </label>
              <input
                className={`form-input ${fieldErrors.annualTurnover ? 'input-error' : ''}`}
                type="number"
                step="any"
                placeholder="Enter amount in INR (e.g. 10000000 for 1 Cr)"
                value={verify.annualTurnover}
                onChange={e => {
                  setVerify({ ...verify, annualTurnover: e.target.value });
                  setFieldErrors(p => ({ ...p, annualTurnover: '' }));
                }}
              />
              <span className="form-hint">Enter the exact amount in rupees — no commas (e.g. 10000000 = ₹1 Cr)</span>
              <FieldError msg={fieldErrors.annualTurnover} />

              {verify.annualTurnover && !isNaN(Number(verify.annualTurnover)) && (
                <div className={`cb-gst-status ${gstRequired ? 'cb-gst-required' : 'cb-gst-exempt'}`}>
                  {gstRequired
                    ? '⚠️ GST registration is mandatory for turnover above ₹20 Lakhs — please provide your GSTIN below'
                    : '✓ Below GST threshold (₹20 Lakhs for services) — GST not mandatory'}
                </div>
              )}
            </div>

            {/* GST — conditionally required */}
            {gstRequired && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">GST Number *</label>
                <input
                  className={`form-input cb-mono ${fieldErrors.gstNumber ? 'input-error' : ''}`}
                  placeholder="22ABCDE1234F1Z5"
                  maxLength={15} style={{ textTransform: 'uppercase' }}
                  value={verify.gstNumber}
                  onChange={e => { setVerify({ ...verify, gstNumber: e.target.value.toUpperCase() }); setFieldErrors(p => ({ ...p, gstNumber: '' })); }}
                />
                <span className="form-hint">15-character GSTIN</span>
                <FieldError msg={fieldErrors.gstNumber} />
              </div>
            )}

            {/* Optional GST below threshold */}
            {!gstRequired && verify.annualTurnover && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">
                  GST Number <span className="cb-optional">(optional — voluntarily registered?)</span>
                </label>
                <input
                  className={`form-input cb-mono ${fieldErrors.gstNumber ? 'input-error' : ''}`}
                  placeholder="22ABCDE1234F1Z5"
                  maxLength={15} style={{ textTransform: 'uppercase' }}
                  value={verify.gstNumber}
                  onChange={e => { setVerify({ ...verify, gstNumber: e.target.value.toUpperCase() }); setFieldErrors(p => ({ ...p, gstNumber: '' })); }}
                />
                <FieldError msg={fieldErrors.gstNumber} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: Documents ── */}
      {step === 2 && (
        <div className="cb-section">
          <div className="cb-section-title">Supporting Documents</div>
          <div className="cb-info-banner">
            📄 Upload clear scans or photos. Accepted formats: PDF, JPG, PNG. Max {MAX_FILE_SIZE_MB}MB per file.
            Documents are reviewed by admin and not visible to customers.
          </div>

          <div className="cb-doc-group-label">Required Documents</div>
          {MANDATORY_DOCS.map(doc => (
            <DocUploadRow key={doc.type} doc={doc}
              uploaded={documents[doc.type]}
              fieldError={fieldErrors[doc.type]}
              onUpload={file => { setDocuments(prev => ({ ...prev, [doc.type]: file })); setFieldErrors(p => ({ ...p, [doc.type]: '' })); }}
              onRemove={() => setDocuments(prev => { const n = { ...prev }; delete n[doc.type]; return n; })} />
          ))}

          {gstRequired && (
            <DocUploadRow
              doc={{ type: 'GST_CERTIFICATE', label: 'GST Certificate', desc: 'GST registration certificate from GSTIN portal', required: true }}
              uploaded={documents['GST_CERTIFICATE']}
              fieldError={fieldErrors['GST_CERTIFICATE']}
              onUpload={file => { setDocuments(prev => ({ ...prev, GST_CERTIFICATE: file })); setFieldErrors(p => ({ ...p, GST_CERTIFICATE: '' })); }}
              onRemove={() => setDocuments(prev => { const n = { ...prev }; delete n.GST_CERTIFICATE; return n; })} />
          )}

          <div className="cb-doc-group-label" style={{ marginTop: 20 }}>
            Additional Documents <span className="cb-optional">(upload at least one for faster approval)</span>
          </div>
          {OPTIONAL_DOCS.map(doc => (
            <DocUploadRow key={doc.type} doc={doc}
              uploaded={documents[doc.type]}
              fieldError={fieldErrors[doc.type]}
              onUpload={file => setDocuments(prev => ({ ...prev, [doc.type]: file }))}
              onRemove={() => setDocuments(prev => { const n = { ...prev }; delete n[doc.type]; return n; })} />
          ))}

          <div className="cb-doc-summary">
            {Object.keys(documents).length} document{Object.keys(documents).length !== 1 ? 's' : ''} ready to upload
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="cb-nav">
        {step > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => { setError(''); setFieldErrors({}); setStep(s => s - 1); }}>
            ← Back
          </button>
        )}
        {onCancel && step === 0 && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        )}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={nextStep}>
            Next →
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '⏳ Submitting...' : '✓ Submit for Approval'}
          </button>
        )}
      </div>
    </div>
  );
}