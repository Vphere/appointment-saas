import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMyBusinesses } from '../api/business';
import { getMyServices } from '../api/services';
import {
  getWorkingHoursByService,
  saveWorkingHours,
  updateWorkingHours,
  bulkSaveWorkingHours,
} from '../api/workingHours';
import Spinner from '../components/Spinner';
import '../styles/owner.css';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
};
const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

function toTimeString(val) {
  if (!val) return null;
  if (/^\d{2}:\d{2}:\d{2}$/.test(val)) return val;
  if (/^\d{2}:\d{2}$/.test(val)) return `${val}:00`;
  return null;
}
function toInputTime(val) {
  if (!val) return '';
  return String(val).slice(0, 5);
}

export default function WorkingHours() {
  const [searchParams] = useSearchParams();
  const preSelectedBusinessId = searchParams.get('businessId');

  const [businesses, setBusinesses]             = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(preSelectedBusinessId || '');
  const [services, setServices]                 = useState([]);
  const [selectedService, setSelectedService]   = useState('');
  const [hours, setHours]                       = useState({});
  const [loadingServices, setLoadingServices]   = useState(false);
  const [loadingHours, setLoadingHours]         = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [msg, setMsg]                           = useState('');

  // Bulk-apply state
  const [bulkStart, setBulkStart] = useState('09:00');
  const [bulkEnd, setBulkEnd]     = useState('18:00');
  const [selectedDays, setSelectedDays] = useState([]);

  useEffect(() => {
    getMyBusinesses()
      .then((r) => {
        const approvedBusinesses = r.data.filter(
          (b) => (b.status || b.approvalStatus || '').toUpperCase() === 'APPROVED'
        );

        setBusinesses(approvedBusinesses);

        // ✅ Optional safety check (same as before)
        if (preSelectedBusinessId) {
          const exists = approvedBusinesses.some(
            (b) => String(b.id) === String(preSelectedBusinessId)
          );

          if (exists) {
            loadServices(preSelectedBusinessId);
            setSelectedBusiness(preSelectedBusinessId);
          } else {
            setSelectedBusiness('');
          }
        }
      })
      .catch(() => {});
    }, []);

  const loadServices = (bizId) => {
    setLoadingServices(true);
    setServices([]);
    setSelectedService('');
    setHours({});
    getMyServices(bizId)
      .then((r) => setServices(Array.isArray(r.data) ? r.data : []))
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  };

  const loadHours = (svcId) => {
    setLoadingHours(true);
    setHours({});
    getWorkingHoursByService(svcId)
      .then((r) => {
        const map = {};
        (r.data || []).forEach((h) => { map[h.dayOfWeek] = h; });
        setHours(map);
      })
      .catch(() => setHours({}))
      .finally(() => setLoadingHours(false));
  };

  const handleBusinessChange = (bizId) => {
    setSelectedBusiness(bizId);
    if (bizId) loadServices(bizId);
    else { setServices([]); setSelectedService(''); setHours({}); }
  };

  const handleServiceChange = (svcId) => {
    setSelectedService(svcId);
    if (svcId) loadHours(svcId);
    else setHours({});
  };

  // Toggle a day in bulk selection
  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleAllWeekdays = () => {
    const allSelected = WEEKDAYS.every((d) => selectedDays.includes(d));
    setSelectedDays(allSelected
      ? selectedDays.filter((d) => !WEEKDAYS.includes(d))
      : [...new Set([...selectedDays, ...WEEKDAYS])]
    );
  };

  const toggleAllDays = () => {
    const allSelected = DAYS.every((d) => selectedDays.includes(d));
    setSelectedDays(allSelected ? [] : [...DAYS]);
  };

  // Apply bulk time to all selected days
  const handleBulkApply = async () => {
    if (!selectedService) return setMsg('Please select a service first');
    if (selectedDays.length === 0) return setMsg('Select at least one day');
    const start = toTimeString(bulkStart);
    const end   = toTimeString(bulkEnd);
    if (!start || !end) return setMsg('Invalid time values');

    setSaving(true); setMsg('');
    try {
      await bulkSaveWorkingHours({
        serviceId: parseInt(selectedService),
        days: selectedDays,
        startTime: start,
        endTime: end,
        open: true,
      });
      setMsg('✓ Working hours saved for selected days!');
      setTimeout(() => setMsg(''), 4000);
      loadHours(selectedService);
      setSelectedDays([]);
    } catch (e) {
      setMsg(`✗ ${e.response?.data?.message || 'Failed to save'}`);
    } finally {
      setSaving(false);
    }
  };

  // Save / update individual day
  const handleSaveDay = async (day) => {
    if (!selectedService) return;
    const entry = hours[day] || {};
    const startTime = toTimeString(entry.startTime || '09:00');
    const endTime   = toTimeString(entry.endTime   || '18:00');
    const open      = entry.open !== false;

    setSaving(day); setMsg('');
    try {
      if (entry.id) {
        await updateWorkingHours(entry.id, { serviceId: parseInt(selectedService), dayOfWeek: day, startTime, endTime, open });
      } else {
        const res = await saveWorkingHours({ serviceId: parseInt(selectedService), dayOfWeek: day, startTime, endTime, open });
        setHours((prev) => ({ ...prev, [day]: res.data }));
      }
      setMsg(`✓ ${DAY_LABELS[day]} saved!`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg(`✗ ${e.response?.data?.message || 'Failed to save'}`);
    } finally {
      setSaving(null);
    }
  };

  const updateDay = (day, field, value) => {
    setHours((prev) => ({
      ...prev,
      [day]: { dayOfWeek: day, open: true, startTime: '09:00', endTime: '18:00', ...(prev[day] || {}), [field]: value },
    }));
  };

  return (
    <div className="page-container" style={{ maxWidth: 840 }}>
      <div className="page-header">
        <h1 className="page-title">Working Hours</h1>
        <p className="page-subtitle">Set availability per service</p>
      </div>

      {/* Step 1: Select Business */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">① Select Business</label>
          <select className="form-select" value={selectedBusiness}
            onChange={(e) => handleBusinessChange(e.target.value)}>
            <option value="">Choose a business...</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Step 2: Select Service */}
      {selectedBusiness && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">② Select Service</label>
            {loadingServices ? (
              <div style={{ padding: '8px 0' }}><Spinner message="Loading services..." /></div>
            ) : services.length === 0 ? (
              <p className="text-muted" style={{ marginTop: 8 }}>No services found — add services first</p>
            ) : (
              <select className="form-select" value={selectedService}
                onChange={(e) => handleServiceChange(e.target.value)}>
                <option value="">Choose a service...</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Configure hours */}
      {selectedService && (
        <div className="card">
          {loadingHours ? (
            <Spinner message="Loading working hours..." />
          ) : (
            <>
              {msg && (
                <div className={`alert ${msg.startsWith('✓') ? 'alert-success' : 'alert-error'}`}
                  style={{ marginBottom: 16 }}>
                  {msg}
                </div>
              )}

              {/* Bulk apply bar */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--text-primary)' }}>
                  ③ Apply Time Range to Multiple Days
                </div>

                {/* Day selection chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <button
                    onClick={toggleAllDays}
                    className={`filter-btn ${DAYS.every((d) => selectedDays.includes(d)) ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem' }}
                  >All</button>
                  <button
                    onClick={toggleAllWeekdays}
                    className={`filter-btn ${WEEKDAYS.every((d) => selectedDays.includes(d)) ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem' }}
                  >Weekdays</button>
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`filter-btn ${selectedDays.includes(day) ? 'active' : ''}`}
                      style={{ fontSize: '0.78rem' }}
                    >
                      {DAY_LABELS[day].slice(0, 3)}
                    </button>
                  ))}
                </div>

                <div className="wh-bulk-bar">
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input type="time" className="form-input" value={bulkStart}
                      onChange={(e) => setBulkStart(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input type="time" className="form-input" value={bulkEnd}
                      onChange={(e) => setBulkEnd(e.target.value)} />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleBulkApply}
                    disabled={saving === true || selectedDays.length === 0}
                    style={{ flexShrink: 0 }}
                  >
                    {saving === true ? '⏳ Applying...' : `Apply to ${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--border)', marginBottom: 20 }} />

              {/* Per-day rows */}
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: 'var(--text-primary)' }}>
                ④ Fine-tune Individual Days
              </div>

              <div className="wh-day-grid">
                {DAYS.map((day) => {
                  const h = hours[day] || {};
                  const isOpen = h.open !== false;
                  return (
                    <div key={day} className={`wh-day-row ${isOpen ? '' : 'closed'}`}>
                      {/* Toggle switch */}
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={isOpen}
                          onChange={(e) => updateDay(day, 'open', e.target.checked)}
                        />
                        <span className="toggle-slider" />
                      </label>

                      <span className="wh-day-label">{DAY_LABELS[day]}</span>

                      {isOpen ? (
                        <div className="wh-time-row">
                          <input
                            type="time"
                            className="form-input"
                            value={toInputTime(h.startTime) || '09:00'}
                            onChange={(e) => updateDay(day, 'startTime', e.target.value)}
                            style={{ maxWidth: 128 }}
                          />
                          <span>to</span>
                          <input
                            type="time"
                            className="form-input"
                            value={toInputTime(h.endTime) || '18:00'}
                            onChange={(e) => updateDay(day, 'endTime', e.target.value)}
                            style={{ maxWidth: 128 }}
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSaveDay(day)}
                            disabled={saving === day}
                          >
                            {saving === day ? '⏳' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Closed — toggle to set hours
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
