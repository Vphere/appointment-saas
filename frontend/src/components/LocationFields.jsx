// LocationFields.jsx — two entry modes + graceful API fallback

import { useState, useCallback } from 'react';
import './LocationFields.css';

// ── Pincode lookup (India Post API) ──────────────────────────────
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

// ── Entry mode toggle ─────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────
export default function LocationFields({ values, onChange }) {
  // 'pincode' = try API first | 'manual' = direct entry
  const [mode, setMode] = useState('pincode');

  // Pincode lookup state
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError,   setPincodeError]   = useState('');
  // After a successful lookup the auto-filled fields are locked
  // (user can still click "Edit" to unlock them)
  const [autoFilled,  setAutoFilled]  = useState(false);
  // After API failure in pincode mode, unlock manual fields
  const [apiFailed,   setApiFailed]   = useState(false);

  // ── Switch mode ───────────────────────────────────────────────
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setPincodeError('');
    setAutoFilled(false);
    setApiFailed(false);
    // Clear everything so the form starts fresh
    onChange({ address: '', pincode: '', city: '', state: '', country: '' });
  };

  // ── Pincode change handler ────────────────────────────────────
  const handlePincodeChange = useCallback(async (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    // Reset auto-fill state when user edits pincode
    setAutoFilled(false);
    setApiFailed(false);
    setPincodeError('');
    onChange({ ...values, pincode: val, city: '', state: '', country: '' });

    if (val.length === 6) {
      setPincodeLoading(true);
      try {
        const result = await fetchPincodeDetails(val);
        onChange({ ...values, pincode: val, ...result });
        setAutoFilled(true);
        setApiFailed(false);
        setPincodeError('');
      } catch {
        // API failed — tell user and let them type manually
        setApiFailed(true);
        setAutoFilled(false);
        setPincodeError(
          'Could not auto-fill location details for this pincode. ' +
          'Please enter city, state and country manually below.'
        );
      } finally {
        setPincodeLoading(false);
      }
    }
  }, [values, onChange]);

  // ── Whether the city/state/country fields are editable ────────
  // In pincode mode: editable only after auto-fill (user wants to correct)
  //                  OR after API failure
  // In manual mode:  always editable
  const locationEditable = mode === 'manual' || apiFailed || autoFilled;

  return (
    <div className="lf-root">
      <div className="lf-section-label">📍 Service Location</div>

      {/* Mode selector */}
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
              className="form-input lf-pincode-input"
              placeholder="e.g. 382418"
              maxLength={6}
              value={values.pincode || ''}
              onChange={handlePincodeChange}
            />
            {autoFilled && !apiFailed && (
              <span className="lf-pincode-tag">
                ✓ {values.city}{values.state ? `, ${values.state}` : ''}
              </span>
            )}
          </div>

          {/* Error — API failed */}
          {pincodeError && (
            <div className="lf-pincode-error">
              ⚠ {pincodeError}
            </div>
          )}

          {/* Hint when no error and not yet filled */}
          {!pincodeError && !autoFilled && (
            <span className="form-hint">Enter 6-digit pincode to auto-fill details</span>
          )}

          {/* After successful auto-fill, let user override */}
          {autoFilled && !apiFailed && (
            <div className="lf-autofill-notice">
              ✓ Location auto-filled from pincode.
              <button
                type="button"
                className="lf-edit-link"
                onClick={() => setAutoFilled(true)} // already true — just keeps fields unlocked
              >
                Edit details
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MANUAL MODE — just the pincode field, no API ── */}
      {mode === 'manual' && (
        <div className="form-group lf-pincode-group">
          <label className="form-label">Pincode</label>
          <input
            className="form-input lf-pincode-input"
            placeholder="e.g. 382418"
            maxLength={10}
            value={values.pincode || ''}
            onChange={e => onChange({ ...values, pincode: e.target.value.replace(/\D/g, '') })}
          />
        </div>
      )}

      {/* ── Address — always shown ── */}
      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label className="form-label">Address / Street</label>
        <input
          className="form-input"
          placeholder="e.g. 3rd Floor, Infinity Mall, Link Road"
          value={values.address || ''}
          onChange={e => onChange({ ...values, address: e.target.value })}
        />
      </div>

      {/* ── City / State / Country ── */}
      {/* In pincode mode, shown only after auto-fill or API failure */}
      {/* In manual mode, always shown */}
      {(mode === 'manual' || apiFailed || autoFilled) && (
        <div className="lf-location-fields-grid">
          <div className="form-group">
            <label className="form-label">City *</label>
            <input
              className={`form-input ${!locationEditable ? 'lf-auto-field' : ''}`}
              placeholder="e.g. Ahmedabad"
              value={values.city || ''}
              readOnly={!locationEditable}
              onChange={e => onChange({ ...values, city: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">State *</label>
            <input
              className={`form-input ${!locationEditable ? 'lf-auto-field' : ''}`}
              placeholder="e.g. Gujarat"
              value={values.state || ''}
              readOnly={!locationEditable}
              onChange={e => onChange({ ...values, state: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Country</label>
            <input
              className={`form-input ${!locationEditable ? 'lf-auto-field' : ''}`}
              placeholder="e.g. India"
              value={values.country || ''}
              readOnly={!locationEditable}
              onChange={e => onChange({ ...values, country: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Prompt shown in pincode mode before user types pincode */}
      {mode === 'pincode' && !autoFilled && !apiFailed && !values.pincode && (
        <div className="lf-waiting-hint">
          City, state and country will appear here after entering your pincode.
        </div>
      )}

      {/* Prompt shown in pincode mode when pincode is partially entered */}
      {mode === 'pincode' && !autoFilled && !apiFailed && values.pincode && values.pincode.length < 6 && (
        <div className="lf-waiting-hint">
          Enter all 6 digits to look up location…
        </div>
      )}
    </div>
  );
}