import { useState, useImperativeHandle, forwardRef } from 'react';
import './LocationFields.css';

async function fetchPincodeDetails(pincode) {
  const res  = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
  const data = await res.json();
  if (!data?.[0] || data[0].Status !== 'Success' || !data[0].PostOffice?.length)
    throw new Error('Pincode not found');
  const po = data[0].PostOffice[0];
  return {
    city:    po.District || po.Name || '',
    state:   po.State    || '',
    country: 'India',
  };
}

function ModeToggle({ mode, onChange }) {
  return (
    <div className="lf-mode-toggle">
      <button
        type="button"
        className={`lf-mode-btn ${mode === 'pincode' ? 'lf-mode-active' : ''}`}
        onClick={() => onChange('pincode')}
      >
        📮 Enter Pincode
        <span className="lf-mode-desc">Auto-fill city, state & country</span>
      </button>
      <button
        type="button"
        className={`lf-mode-btn ${mode === 'manual' ? 'lf-mode-active' : ''}`}
        onClick={() => onChange('manual')}
      >
        ✏️ Enter Manually
        <span className="lf-mode-desc">Type all location details directly</span>
      </button>
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="lf-field-error">⚠ {msg}</div>;
}

// ── forwardRef so parent can call locationRef.current.validate() ──
const LocationFields = forwardRef(function LocationFields({ values, onChange }, ref) {
  const [mode, setMode]                     = useState('pincode');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError,   setPincodeError]   = useState('');
  const [apiFailed,      setApiFailed]      = useState(false);
  const [fieldErrors,    setFieldErrors]    = useState({});
  const [touched,        setTouched]        = useState({});

  // ── Validation rules ──────────────────────────────────────────────
  const runValidation = (currentValues, currentMode) => {
    const errs = {};
    if (currentMode === 'pincode') {
      if (!currentValues.pincode || currentValues.pincode.length < 6)
        errs.pincode = 'Enter a valid 6-digit pincode';
    }
    if (!currentValues.address?.trim()) errs.address = 'Address is required';
    if (!currentValues.city?.trim())    errs.city    = 'City is required';
    if (!currentValues.state?.trim())   errs.state   = 'State is required';
    if (!currentValues.country?.trim()) errs.country = 'Country is required';
    return errs;
  };

  // ── Exposed to parent via ref ─────────────────────────────────────
  // Parent calls locationRef.current.validate() on form submit.
  // Returns true if valid, false if not (and shows all errors).
  useImperativeHandle(ref, () => ({
    validate() {
      const errs = runValidation(values, mode);
      setFieldErrors(errs);
      // Mark all validated fields as touched so errors are visible
      setTouched({ pincode: true, address: true, city: true, state: true, country: true });
      return Object.keys(errs).length === 0;
    },
  }));

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const errs = runValidation(values, mode);
    setFieldErrors(prev => ({ ...prev, [field]: errs[field] || '' }));
  };

  const clearFieldError = (field) =>
    setFieldErrors(prev => ({ ...prev, [field]: '' }));

  // ── Mode switch ───────────────────────────────────────────────────
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setPincodeError('');
    setApiFailed(false);
    setTouched({});
    setFieldErrors({});
    onChange({ address: '', pincode: '', city: '', state: '', country: '' });
  };

  // ── Pincode change + API lookup ───────────────────────────────────
  const handlePincodeChange = async (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setApiFailed(false);
    setPincodeError('');
    clearFieldError('pincode');
    onChange({ ...values, pincode: val, city: '', state: '', country: '' });

    if (val.length === 6) {
      setPincodeLoading(true);
      try {
        const result = await fetchPincodeDetails(val);
        onChange({ ...values, pincode: val, ...result });
        setFieldErrors(prev => ({
          ...prev, pincode: '', city: '', state: '', country: ''
        }));
      } catch {
        setApiFailed(true);
        setPincodeError(
          'Could not auto-fill location for this pincode. ' +
          'Please enter city, state and country manually below.'
        );
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const lookupSucceeded  = mode === 'pincode' && !!values.city && !apiFailed;
  const showLocationFields = mode === 'manual' || apiFailed || lookupSucceeded;

  return (
    <div className="lf-root">
      <div className="lf-section-label">📍 Service Location</div>

      <ModeToggle mode={mode} onChange={handleModeChange} />

      {/* ── PINCODE MODE ── */}
      {mode === 'pincode' && (
        <div className="form-group lf-pincode-group">
          <label className="form-label">
            Pincode *
            {pincodeLoading && <span className="lf-loading"> · Looking up…</span>}
          </label>
          <div className="lf-pincode-wrap">
            <input
              className={`form-input lf-pincode-input ${
                touched.pincode && fieldErrors.pincode ? 'lf-input-error' : ''
              }`}
              placeholder="e.g. 382418"
              maxLength={6}
              value={values.pincode || ''}
              onChange={handlePincodeChange}
              onBlur={() => handleBlur('pincode')}
            />
            {lookupSucceeded && (
              <span className="lf-pincode-tag">
                ✓ {values.city}{values.state ? `, ${values.state}` : ''}
              </span>
            )}
          </div>

          {pincodeError && (
            <div className="lf-pincode-error">⚠ {pincodeError}</div>
          )}

          {touched.pincode && fieldErrors.pincode && !pincodeError && (
            <FieldError msg={fieldErrors.pincode} />
          )}

          {!pincodeError && !fieldErrors.pincode && !lookupSucceeded && (
            <span className="form-hint">
              {!values.pincode
                ? 'Enter 6-digit pincode to auto-fill details'
                : values.pincode.length < 6
                  ? 'Enter all 6 digits to look up location…'
                  : null}
            </span>
          )}

          {lookupSucceeded && (
            <div className="lf-autofill-notice">
              ✓ Location auto-filled from pincode. You can edit the fields below if needed.
            </div>
          )}
        </div>
      )}

      {/* ── MANUAL MODE pincode ── */}
      {mode === 'manual' && (
        <div className="form-group lf-pincode-group">
          <label className="form-label">Pincode</label>
          <input
            className="form-input lf-pincode-input"
            placeholder="e.g. 382418"
            maxLength={10}
            value={values.pincode || ''}
            onChange={e => onChange({
              ...values, pincode: e.target.value.replace(/\D/g, '')
            })}
          />
        </div>
      )}

      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label className="form-label">Address / Street *</label>
        <input
          className={`form-input ${
            touched.address && fieldErrors.address ? 'lf-input-error' : ''
          }`}
          placeholder="e.g. 3rd Floor, Infinity Mall, Link Road"
          value={values.address || ''}
          onChange={e => {
            onChange({ ...values, address: e.target.value });
            clearFieldError('address');
          }}
          onBlur={() => handleBlur('address')}
        />
        {touched.address && <FieldError msg={fieldErrors.address} />}
      </div>

      {/* ── City / State / Country ── */}
      {showLocationFields && (
        <div className="lf-location-fields-grid">
          <div className="form-group">
            <label className="form-label">City *</label>
            <input
              className={`form-input ${
                touched.city && fieldErrors.city ? 'lf-input-error' : ''
              }`}
              placeholder="e.g. Ahmedabad"
              value={values.city || ''}
              onChange={e => {
                onChange({ ...values, city: e.target.value });
                clearFieldError('city');
              }}
              onBlur={() => handleBlur('city')}
            />
            {touched.city && <FieldError msg={fieldErrors.city} />}
          </div>

          <div className="form-group">
            <label className="form-label">State *</label>
            <input
              className={`form-input ${
                touched.state && fieldErrors.state ? 'lf-input-error' : ''
              }`}
              placeholder="e.g. Gujarat"
              value={values.state || ''}
              onChange={e => {
                onChange({ ...values, state: e.target.value });
                clearFieldError('state');
              }}
              onBlur={() => handleBlur('state')}
            />
            {touched.state && <FieldError msg={fieldErrors.state} />}
          </div>

          <div className="form-group">
            <label className="form-label">Country *</label>
            <input
              className={`form-input ${
                touched.country && fieldErrors.country ? 'lf-input-error' : ''
              }`}
              placeholder="e.g. India"
              value={values.country || ''}
              onChange={e => {
                onChange({ ...values, country: e.target.value });
                clearFieldError('country');
              }}
              onBlur={() => handleBlur('country')}
            />
            {touched.country && <FieldError msg={fieldErrors.country} />}
          </div>
        </div>
      )}

      {/* Waiting hint */}
      {mode === 'pincode' && !showLocationFields && !pincodeLoading && (
        <div className="lf-waiting-hint">
          City, state and country will appear here after entering your pincode.
        </div>
      )}
    </div>
  );
});

export default LocationFields;