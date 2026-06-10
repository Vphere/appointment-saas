import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMyBusinesses } from '../api/business';
import { getMyServices, serviceDropdownLabel } from '../api/services';
import {
  getWorkingHoursByService,
  saveWorkingHours,
  updateWorkingHours,
  bulkSaveWorkingHours,
} from '../api/workingHours';
import { getHolidays, addHoliday, deleteHoliday } from '../api/holidays';
import { getPhotos, uploadPhoto, deletePhoto } from '../api/photos';
import Spinner from '../components/Spinner';
import '../pages/BusinessSettings.css';

const BASE_URL  = 'http://localhost:8080';
const MAX_PHOTOS = 5;

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
const DAY_LABELS = {
  MONDAY:'Monday', TUESDAY:'Tuesday', WEDNESDAY:'Wednesday',
  THURSDAY:'Thursday', FRIDAY:'Friday', SATURDAY:'Saturday', SUNDAY:'Sunday',
};
const WEEKDAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'];

function toTimeString(val) {
  if (!val) return null;
  if (/^\d{2}:\d{2}:\d{2}$/.test(val)) return val;
  if (/^\d{2}:\d{2}$/.test(val)) return `${val}:00`;
  return null;
}
function toInputTime(val) { return val ? String(val).slice(0, 5) : ''; }

// ── Format a yyyy-mm-dd string for display ────────────────────────
function formatDateDisplay(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', weekday: 'short',
  });
}

// ── Shared atoms ──────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return <div className={`bs-card ${className}`}>{children}</div>;
}

function SectionTitle({ children, sub }) {
  return (
    <div className="bs-section-title">
      <h3>{children}</h3>
      {sub && <p>{sub}</p>}
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  const ok = msg.startsWith('✓');
  return (
    <div className={`bs-toast ${ok ? 'bs-toast--ok' : 'bs-toast--err'}`}>
      {msg}
    </div>
  );
}

function Label({ children }) {
  return <p className="bs-label">{children}</p>;
}

function Btn({ children, onClick, disabled, variant = 'primary', size = 'md' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bs-btn bs-btn--${variant} bs-btn--${size}`}
    >
      {children}
    </button>
  );
}

function ChipBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bs-chip ${active ? 'bs-chip--on' : 'bs-chip--off'}`}
    >
      {label}
    </button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="bs-toggle-wrap">
      <span className="bs-toggle-track-wrap">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className={`bs-toggle-track bs-toggle-track--${checked ? 'on' : 'off'}`} />
        <span className={`bs-toggle-thumb bs-toggle-thumb--${checked ? 'on' : 'off'}`} />
      </span>
      {label && <span className="bs-toggle-label">{label}</span>}
    </label>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="bs-tabbar">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`bs-tab bs-tab--${active === t.id ? 'on' : 'off'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Custom Date Input ─────────────────────────────────────────────
// Strategy: the styled button calls nativeRef.current.showPicker()
// which programmatically opens the browser's native date picker.
// The native input itself is visually hidden (height 0, opacity 0)
// but still in DOM flow so showPicker() works reliably on all browsers.
function DateInput({ value, onChange, min, placeholder = 'Select a date…' }) {
  const nativeRef = useRef(null);

  const handleTriggerClick = () => {
    if (!nativeRef.current) return;
    try {
      nativeRef.current.showPicker();   // Chrome 99+, Firefox 101+, Safari 16+
    } catch {
      nativeRef.current.focus();        // fallback: focus reveals picker on older browsers
      nativeRef.current.click();
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="bs-date-wrapper">
      {/* Hidden native input — zero height, no pointer events so it doesn't
          intercept clicks, but showPicker() still works because it's in the DOM */}
      <input
        ref={nativeRef}
        type="date"
        value={value}
        min={min}
        onChange={e => onChange(e.target.value)}
        className="bs-date-native"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Fully styled clickable trigger */}
      <button
        type="button"
        className="bs-date-trigger"
        onClick={handleTriggerClick}
        aria-label={value ? `Selected date: ${formatDateDisplay(value)}` : placeholder}
      >
        <span className="bs-date-icon">📅</span>
        <span className={`bs-date-text ${value ? 'bs-date-text--value' : 'bs-date-text--placeholder'}`}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        {value && (
          <span
            className="bs-date-clear"
            onClick={handleClear}
            role="button"
            title="Clear date"
          >
            ✕
          </span>
        )}
      </button>
    </div>
  );
}

// ── Business + Service selector ───────────────────────────────────
function BusinessServiceSelector({
  businesses,
  selectedBusiness, onBusinessChange,
  services, loadingServices,
  selectedService, onServiceChange,
}) {
  return (
    <div className="bs-selector-stack">
      <Card>
        <label className="form-label">Select Business</label>
        <select
          className="form-select"
          value={selectedBusiness}
          onChange={e => onBusinessChange(e.target.value)}
        >
          <option value="">Choose a business...</option>
          {businesses.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </Card>

      {selectedBusiness && (
        <Card>
          <label className="form-label">Select Service</label>
          {loadingServices ? (
            <Spinner message="Loading services…" />
          ) : services.length === 0 ? (
            <p style={{ color: 'var(--bs-muted)', fontSize: 13, margin: '8px 0 0' }}>
              No services found — add services first
            </p>
          ) : (
            <select
              className="form-select"
              value={selectedService}
              onChange={e => onServiceChange(e.target.value)}
            >
              <option value="">Choose a service…</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {serviceDropdownLabel(s)}
                </option>
              ))}
            </select>
          )}
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// WORKING HOURS TAB
// ══════════════════════════════════════════════════════════════════
function WorkingHoursTab({ businesses }) {
  const [searchParams]                          = useSearchParams();
  const preSelectedBusinessId                   = searchParams.get('businessId');
  const [selectedBusiness, setSelectedBusiness] = useState(preSelectedBusinessId || '');
  const [services, setServices]                 = useState([]);
  const [selectedService, setSelectedService]   = useState('');
  const [hours, setHours]                       = useState({});
  const [loadingServices, setLoadingServices]   = useState(false);
  const [loadingHours, setLoadingHours]         = useState(false);
  const [saving, setSaving]                     = useState(null);
  const [msg, setMsg]                           = useState('');
  // Per-row inline feedback: { MONDAY: '✓ Saved', TUESDAY: '✗ Failed', … }
  const [rowMsg, setRowMsg]                     = useState({});
  const [bulkStart, setBulkStart]               = useState('09:00');
  const [bulkEnd, setBulkEnd]                   = useState('18:00');
  const [selectedDays, setSelectedDays]         = useState([]);

  useEffect(() => {
    if (preSelectedBusinessId) {
      const exists = businesses.some(b => String(b.id) === String(preSelectedBusinessId));
      if (exists) loadServices(preSelectedBusinessId);
    }
  }, [businesses]);

  const loadServices = (bizId) => {
    setLoadingServices(true); setServices([]); setSelectedService(''); setHours({});
    getMyServices(bizId)
      .then(r => setServices(Array.isArray(r.data) ? r.data : []))
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  };

  const loadHours = (svcId) => {
    setLoadingHours(true); setHours({});
    getWorkingHoursByService(svcId)
      .then(r => {
        const map = {};
        (r.data || []).forEach(h => { map[h.dayOfWeek] = h; });
        setHours(map);
      })
      .catch(() => setHours({}))
      .finally(() => setLoadingHours(false));
  };

  const toggleDay = (day) =>
    setSelectedDays(p => p.includes(day) ? p.filter(d => d !== day) : [...p, day]);

  const handleBulkApply = async () => {
    if (!selectedService) return setMsg('Please select a service first');
    if (!selectedDays.length) return setMsg('Select at least one day');
    const start = toTimeString(bulkStart), end = toTimeString(bulkEnd);
    if (!start || !end) return setMsg('Invalid time values');
    setSaving('bulk'); setMsg('');
    try {
      await bulkSaveWorkingHours({
        serviceId: parseInt(selectedService),
        days: selectedDays, startTime: start, endTime: end, open: true,
      });
      setMsg('✓ Working hours saved for selected days!');
      setTimeout(() => setMsg(''), 4000);
      loadHours(selectedService); setSelectedDays([]);
    } catch (e) {
      setMsg(`✗ ${e.response?.data?.message || 'Failed to save'}`);
    } finally { setSaving(null); }
  };

  const setDayMsg = (day, text, ms = 3000) => {
    setRowMsg(p => ({ ...p, [day]: text }));
    setTimeout(() => setRowMsg(p => ({ ...p, [day]: '' })), ms);
  };

  const handleSaveDay = async (day) => {
    if (!selectedService) return;
    const entry = hours[day] || {};
    const startTime = toTimeString(entry.startTime || '09:00');
    const endTime   = toTimeString(entry.endTime   || '18:00');
    const open      = entry.open !== false;
    setSaving(day);
    try {
      if (entry.id) {
        await updateWorkingHours(entry.id, {
          serviceId: parseInt(selectedService), dayOfWeek: day, startTime, endTime, open,
        });
      } else {
        const res = await saveWorkingHours({
          serviceId: parseInt(selectedService), dayOfWeek: day, startTime, endTime, open,
        });
        setHours(p => ({ ...p, [day]: res.data }));
      }
      setDayMsg(day, '✓ Saved');
    } catch (e) {
      setDayMsg(day, `✗ ${e.response?.data?.message || 'Failed'}`, 5000);
    } finally { setSaving(null); }
  };

  const updateDay = (day, field, value) =>
    setHours(p => ({
      ...p,
      [day]: {
        dayOfWeek: day, open: true, startTime: '09:00', endTime: '18:00',
        ...(p[day] || {}), [field]: value,
      },
    }));

  return (
    <div className="bs-tab-content">
      <BusinessServiceSelector
        businesses={businesses}
        selectedBusiness={selectedBusiness}
        onBusinessChange={v => {
          setSelectedBusiness(v);
          if (v) loadServices(v);
          else { setServices([]); setSelectedService(''); setHours({}); }
        }}
        services={services} loadingServices={loadingServices}
        selectedService={selectedService}
        onServiceChange={v => { setSelectedService(v); if (v) loadHours(v); else setHours({}); }}
      />

      {selectedService && (
        <Card>
          {loadingHours ? <Spinner message="Loading hours…" /> : (
            <>
              <Toast msg={msg} />

              {/* Bulk apply */}
              <SectionTitle sub="Apply one time range to several days at once">
                Bulk Apply
              </SectionTitle>
              <div className="wh-bulk-chips">
                <ChipBtn
                  label="All"
                  active={DAYS.every(d => selectedDays.includes(d))}
                  onClick={() =>
                    setSelectedDays(DAYS.every(d => selectedDays.includes(d)) ? [] : [...DAYS])
                  }
                />
                <ChipBtn
                  label="Weekdays"
                  active={WEEKDAYS.every(d => selectedDays.includes(d))}
                  onClick={() => {
                    const all = WEEKDAYS.every(d => selectedDays.includes(d));
                    setSelectedDays(
                      all
                        ? selectedDays.filter(d => !WEEKDAYS.includes(d))
                        : [...new Set([...selectedDays, ...WEEKDAYS])]
                    );
                  }}
                />
                {DAYS.map(day => (
                  <ChipBtn
                    key={day}
                    label={DAY_LABELS[day].slice(0, 3)}
                    active={selectedDays.includes(day)}
                    onClick={() => toggleDay(day)}
                  />
                ))}
              </div>

              <div className="wh-bulk-times">
                <div className="wh-bulk-time-field">
                  <Label>Start Time</Label>
                  <input
                    type="time"
                    value={bulkStart}
                    onChange={e => setBulkStart(e.target.value)}
                    className="bs-input bs-input--time"
                  />
                </div>
                <div className="wh-bulk-time-field">
                  <Label>End Time</Label>
                  <input
                    type="time"
                    value={bulkEnd}
                    onChange={e => setBulkEnd(e.target.value)}
                    className="bs-input bs-input--time"
                  />
                </div>
                <Btn
                  onClick={handleBulkApply}
                  disabled={saving === 'bulk' || !selectedDays.length}
                >
                  {saving === 'bulk'
                    ? 'Applying…'
                    : `Apply to ${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''}`}
                </Btn>
              </div>

              <div className="wh-divider" />

              {/* Individual days */}
              <SectionTitle sub="Fine-tune each day individually">
                Individual Days
              </SectionTitle>
              <div className="wh-days-list">
                {DAYS.map(day => {
                  const h      = hours[day] || {};
                  const isOpen = h.open !== false;
                  const rMsg   = rowMsg[day] || '';
                  const rOk    = rMsg.startsWith('✓');
                  return (
                    <div
                      key={day}
                      className={`wh-day-row wh-day-row--${isOpen ? 'open' : 'closed'}`}
                    >
                      <Toggle
                        checked={isOpen}
                        onChange={e => updateDay(day, 'open', e.target.checked)}
                      />
                      <span className="wh-day-name">{DAY_LABELS[day]}</span>
                      {isOpen ? (
                        <>
                          <input
                            type="time"
                            value={toInputTime(h.startTime) || '09:00'}
                            onChange={e => updateDay(day, 'startTime', e.target.value)}
                            className="bs-input bs-input--time"
                          />
                          <span className="wh-time-sep">to</span>
                          <input
                            type="time"
                            value={toInputTime(h.endTime) || '18:00'}
                            onChange={e => updateDay(day, 'endTime', e.target.value)}
                            className="bs-input bs-input--time"
                          />
                          <Btn
                            size="sm"
                            onClick={() => handleSaveDay(day)}
                            disabled={saving === day}
                          >
                            {saving === day ? '…' : 'Save'}
                          </Btn>
                          {rMsg && (
                            <span className={`wh-row-msg ${rOk ? 'wh-row-msg--ok' : 'wh-row-msg--err'}`}>
                              {rMsg}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="wh-closed-msg">
                          Closed — toggle to set hours
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HOLIDAYS TAB
// ══════════════════════════════════════════════════════════════════
function HolidaysTab({ businesses }) {
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [services, setServices]                 = useState([]);
  const [loadingServices, setLoadingServices]   = useState(false);
  const [selectedService, setSelectedService]   = useState('');
  const [applyToAll, setApplyToAll]             = useState(false);
  const [holidays, setHolidays]                 = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [date, setDate]                         = useState('');
  const [reason, setReason]                     = useState('');
  const [saving, setSaving]                     = useState(false);
  const [msg, setMsg]                           = useState('');

  const today = new Date().toISOString().split('T')[0];

  const loadServices = (bizId) => {
    setLoadingServices(true); setServices([]); setSelectedService('');
    getMyServices(bizId)
      .then(r => setServices(Array.isArray(r.data) ? r.data : []))
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  };

  const loadHolidays = (bizId) => {
    setLoading(true);
    getHolidays(bizId)
      .then(r => setHolidays(r.data || []))
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false));
  };

  const handleBusinessChange = (bizId) => {
    setSelectedBusiness(bizId); setSelectedService(''); setHolidays([]);
    if (bizId) { loadServices(bizId); loadHolidays(bizId); }
    else setServices([]);
  };

  const handleAdd = async () => {
    if (!selectedBusiness) return setMsg('✗ Select a business first');
    if (!applyToAll && !selectedService)
      return setMsg('✗ Select a service or enable "Apply to All Services"');
    if (!date) return setMsg('✗ Please select a date');
    setSaving(true); setMsg('');
    try {
      const r = await addHoliday({
        businessId:  parseInt(selectedBusiness),
        serviceId:   applyToAll ? null : parseInt(selectedService),
        allServices: applyToAll,
        date,
        reason,
      });
      setHolidays(p =>
        [...p, r.data].sort((a, b) => a.date.localeCompare(b.date))
      );
      setDate(''); setReason('');
      setMsg('✓ Holiday added!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg(`✗ ${e.response?.data?.message || e.message || 'Failed to add holiday'}`);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteHoliday(id);
      setHolidays(p => p.filter(h => h.id !== id));
    } catch { setMsg('✗ Failed to delete holiday'); }
  };

  return (
    <div className="bs-tab-content">

      {/* Business selector */}
      <Card>
        <label className="form-label">Select Business</label>
        <select
          className="form-select"
          value={selectedBusiness}
          onChange={e => handleBusinessChange(e.target.value)}
        >
          <option value="">Choose a business…</option>
          {businesses.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </Card>

      {selectedBusiness && (
        <>
          {/* Add Holiday */}
          <Card>
            <SectionTitle sub="Mark a date as closed — customers won't be able to book on this day">
              Add Holiday / Closure
            </SectionTitle>
            <Toast msg={msg} />

            {/* All Services toggle */}
            <div className={`hol-all-toggle hol-all-toggle--${applyToAll ? 'on' : 'off'}`}>
              <div className="hol-all-toggle-text">
                <p>Apply to All Services</p>
                <p>Blocks bookings across every service in this business on the selected date</p>
              </div>
              <Toggle
                checked={applyToAll}
                onChange={e => {
                  setApplyToAll(e.target.checked);
                  setSelectedService('');
                }}
              />
            </div>

            {/* Service selector when not applying to all */}
            {!applyToAll && (
              <div className="hol-service-select">
                <label className="form-label">Select Service</label>
                {loadingServices ? (
                  <Spinner message="Loading services…" />
                ) : services.length === 0 ? (
                  <p style={{ color: 'var(--bs-muted)', fontSize: 13, margin: '8px 0 0' }}>
                    No services found
                  </p>
                ) : (
                  <select
                    className="form-select"
                    value={selectedService}
                    onChange={e => setSelectedService(e.target.value)}
                  >
                    <option value="">Choose a service…</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {serviceDropdownLabel(s)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Date + Reason + Button */}
            <div className="hol-form-row">
              <div className="hol-date-field">
                <Label>Date</Label>
                <DateInput
                  value={date}
                  min={today}
                  onChange={setDate}
                  placeholder="Pick a date…"
                />
              </div>
              <div className="hol-reason-field">
                <Label>Reason (optional)</Label>
                <input
                  type="text"
                  value={reason}
                  placeholder="e.g. Diwali, Owner vacation…"
                  onChange={e => setReason(e.target.value)}
                  className="bs-input"
                />
              </div>
              <Btn onClick={handleAdd} disabled={saving}>
                {saving ? 'Adding…' : '+ Add Holiday'}
              </Btn>
            </div>
          </Card>

          {/* Holidays list */}
          <Card>
            <SectionTitle
              sub={`${holidays.length} holiday${holidays.length !== 1 ? 's' : ''} scheduled`}
            >
              Scheduled Holidays
            </SectionTitle>
            {loading ? (
              <Spinner message="Loading…" />
            ) : holidays.length === 0 ? (
              <div className="hol-list-empty">
                <div className="hol-empty-icon">📅</div>
                <p>No holidays scheduled. Your business is open every day.</p>
              </div>
            ) : (
              <div className="hol-list">
                {holidays.map(h => {
                  const d         = new Date(h.date + 'T00:00:00');
                  const isPast    = h.date < today;
                  const monthName = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                  const dayAbbr   = d.toLocaleDateString('en-IN', { weekday: 'short' });
                  const fullDate  = d.toLocaleDateString('en-IN', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  });
                  const variant = isPast ? 'past' : 'upcoming';

                  return (
                    <div key={h.id} className={`hol-item hol-item--${variant}`}>
                      <div className="hol-item-left">
                        {/* Calendar widget */}
                        <div className={`hol-cal hol-cal--${variant}`}>
                          <div className={`hol-cal-month hol-cal-month--${variant}`}>
                            <p>{monthName}</p>
                          </div>
                          <div className={`hol-cal-day hol-cal-day--${variant}`}>
                            <p className="hol-cal-num">{d.getDate()}</p>
                            <p className="hol-cal-abbr">{dayAbbr}</p>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="hol-item-info">
                          <p className={`hol-item-date hol-item-date--${variant}`}>
                            {fullDate}
                          </p>
                          <div className="hol-item-tags">
                            <span className={`hol-tag ${h.allServices ? 'hol-tag--all' : 'hol-tag--service'}`}>
                              {h.allServices ? '🏢 All Services' : `⚙ ${h.serviceName || 'Service'}`}
                            </span>
                            {h.reason && (
                              <span className="hol-item-reason">{h.reason}</span>
                            )}
                            {isPast && (
                              <span className="hol-item-past-label">Past</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Btn variant="danger" size="sm" onClick={() => handleDelete(h.id)}>
                        Remove
                      </Btn>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PHOTOS TAB
// ══════════════════════════════════════════════════════════════════
function PhotosTab({ businesses }) {
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [services, setServices]                 = useState([]);
  const [loadingServices, setLoadingServices]   = useState(false);
  const [selectedService, setSelectedService]   = useState('');
  const [photos, setPhotos]                     = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [uploading, setUploading]               = useState(false);
  const [caption, setCaption]                   = useState('');
  const [preview, setPreview]                   = useState(null);
  const [selectedFile, setSelectedFile]         = useState(null);
  const [msg, setMsg]                           = useState('');
  const [lightbox, setLightbox]                 = useState(null);
  const fileRef                                  = useRef();

  const atLimit = photos.length >= MAX_PHOTOS;

  const loadServices = (bizId) => {
    setLoadingServices(true); setServices([]); setSelectedService(''); setPhotos([]);
    getMyServices(bizId)
      .then(r => setServices(Array.isArray(r.data) ? r.data : []))
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  };

  const loadPhotos = (svcId) => {
    setLoading(true); setPhotos([]);
    getPhotos(svcId)
      .then(r => setPhotos(r.data || []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  };

  const handleFile = (f) => {
    if (!f) return;
    setSelectedFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedService) return;
    setUploading(true); setMsg('');
    try {
      const r = await uploadPhoto(selectedService, selectedFile, caption);
      setPhotos(p => [r.data, ...p]);
      setSelectedFile(null); setPreview(null); setCaption('');
      if (fileRef.current) fileRef.current.value = '';
      setMsg('✓ Photo uploaded!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg(`✗ ${e.response?.data?.message || 'Upload failed'}`);
    } finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deletePhoto(id);
      setPhotos(p => p.filter(ph => ph.id !== id));
      if (lightbox?.id === id) setLightbox(null);
    } catch { setMsg('✗ Failed to delete photo'); }
  };

  return (
    <div className="bs-tab-content">

      {/* Lightbox */}
      {lightbox && (
        <div
          className="photos-lightbox-overlay"
          onClick={() => setLightbox(null)}
        >
          <div
            className="photos-lightbox-inner"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={`${BASE_URL}${lightbox.url}`}
              alt={lightbox.caption || ''}
            />
            <div className="photos-lightbox-footer">
              <p className="photos-lightbox-caption">
                {lightbox.caption || 'No caption'}
              </p>
              <div className="photos-lightbox-actions">
                <Btn variant="danger" size="sm" onClick={() => handleDelete(lightbox.id)}>
                  Delete
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => setLightbox(null)}>
                  Close
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      <BusinessServiceSelector
        businesses={businesses}
        selectedBusiness={selectedBusiness}
        onBusinessChange={v => {
          setSelectedBusiness(v); setSelectedService(''); setPhotos([]);
          if (v) loadServices(v); else setServices([]);
        }}
        services={services} loadingServices={loadingServices}
        selectedService={selectedService}
        onServiceChange={v => { setSelectedService(v); if (v) loadPhotos(v); else setPhotos([]); }}
      />

      {selectedService && (
        <>
          {/* Upload card */}
          <Card>
            <SectionTitle
              sub={`${photos.length} / ${MAX_PHOTOS} photos for this service`}
            >
              Upload Photos
            </SectionTitle>
            <Toast msg={msg} />

            {atLimit && (
              <div className="photos-limit-warn">
                ⚠ Maximum {MAX_PHOTOS} photos reached per service. Delete a photo to upload a new one.
              </div>
            )}

            {!atLimit && (
              <>
                <div
                  className={`photos-dropzone${preview ? ' photos-dropzone--active' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                >
                  {preview ? (
                    <img src={preview} alt="preview" />
                  ) : (
                    <>
                      <div className="photos-dropzone-icon">📷</div>
                      <p>Click or drag &amp; drop to upload</p>
                      <p>JPEG, PNG, WebP — max {MAX_PHOTOS} photos per service</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={e => handleFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />

                {selectedFile && (
                  <div className="photos-upload-row">
                    <div className="photos-caption-field">
                      <Label>Caption (optional)</Label>
                      <input
                        type="text"
                        value={caption}
                        placeholder="Describe this photo…"
                        onChange={e => setCaption(e.target.value)}
                        className="bs-input"
                      />
                    </div>
                    <Btn onClick={handleUpload} disabled={uploading}>
                      {uploading ? 'Uploading…' : 'Upload Photo'}
                    </Btn>
                    <Btn
                      variant="ghost"
                      onClick={() => {
                        setSelectedFile(null); setPreview(null); setCaption('');
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                    >
                      Cancel
                    </Btn>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Gallery */}
          <Card>
            <SectionTitle sub="Click any photo to view or delete">Gallery</SectionTitle>
            {loading ? (
              <Spinner message="Loading photos…" />
            ) : photos.length === 0 ? (
              <div className="photos-empty">
                <div className="photos-empty-icon">🖼️</div>
                <p>No photos yet. Upload your first photo above.</p>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="photos-progress-wrap">
                  <div className="photos-progress-labels">
                    <span>{photos.length} of {MAX_PHOTOS} photos</span>
                    <span>
                      {atLimit ? 'Limit reached' : `${MAX_PHOTOS - photos.length} slots remaining`}
                    </span>
                  </div>
                  <div className="photos-progress-track">
                    <div
                      className={`photos-progress-fill photos-progress-fill--${atLimit ? 'limit' : 'ok'}`}
                      style={{ width: `${(photos.length / MAX_PHOTOS) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="photos-grid">
                  {photos.map(photo => (
                    <div
                      key={photo.id}
                      className="photos-thumb"
                      onClick={() => setLightbox(photo)}
                    >
                      <img
                        src={`${BASE_URL}${photo.url}`}
                        alt={photo.caption || ''}
                      />
                      <div className="photos-thumb-overlay">
                        {photo.caption && (
                          <p className="photos-thumb-caption">{photo.caption}</p>
                        )}
                        <button
                          className="photos-thumb-delete"
                          onClick={e => { e.stopPropagation(); handleDelete(photo.id); }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function BusinessSettings() {
  const [businesses, setBusinesses] = useState([]);
  const [tab, setTab]               = useState('hours');

  useEffect(() => {
    getMyBusinesses()
      .then(r => setBusinesses(
        (r.data || []).filter(b =>
          (b.status || b.approvalStatus || '').toUpperCase() === 'APPROVED'
        )
      ))
      .catch(() => {});
  }, []);

  const TABS = [
    { id: 'hours',    label: '🕐 Working Hours' },
    { id: 'holidays', label: '📅 Holidays'       },
    { id: 'photos',   label: '📷 Photos'         },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Business Settings</h1>
        <p className="page-subtitle">
          Manage working hours, holidays, and photos for your businesses
        </p>
      </div>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'hours'    && <WorkingHoursTab businesses={businesses} />}
      {tab === 'holidays' && <HolidaysTab     businesses={businesses} />}
      {tab === 'photos'   && <PhotosTab       businesses={businesses} />}
    </div>
  );
}