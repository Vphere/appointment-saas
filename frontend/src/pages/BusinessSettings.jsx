import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMyBusinesses } from '../api/business';
import { getMyServices } from '../api/services';
import {
  getWorkingHoursByService,
  saveWorkingHours,
  updateWorkingHours,
  bulkSaveWorkingHours,
} from '../api/workingHours';
import { getHolidays, addHoliday, deleteHoliday } from '../api/holidays';
import { getPhotos, uploadPhoto, deletePhoto } from '../api/photos';
import Spinner from '../components/Spinner';

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  bg:      'var(--bg-primary, #0d0f19)',
  surface: 'var(--bg-secondary, #13151f)',
  card:    'var(--bg-card, #1a1d2e)',
  border:  'var(--border, rgba(255,255,255,0.08))',
  muted:   'var(--text-secondary, #64748b)',
  text:    'var(--text-primary, #e2e8f0)',
  accent:  '#6574f8',
  accentBg:'rgba(101,116,248,0.1)',
  emerald: '#34d399',
  amber:   '#fbbf24',
  rose:    '#fb7185',
};

const BASE_URL = 'http://localhost:8080';
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

// ── Shared atoms ───────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: '22px 26px', ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{children}</h3>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 12, color: T.muted }}>{sub}</p>}
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  const ok = msg.startsWith('✓');
  return (
    <div style={{
      padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 16,
      background: ok ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
      color: ok ? T.emerald : T.rose,
      border: `1px solid ${ok ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
    }}>
      {msg}
    </div>
  );
}

function Label({ children }) {
  return (
    <p style={{
      margin: '0 0 5px', fontSize: 10, fontWeight: 700,
      color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {children}
    </p>
  );
}

function SelectInput({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange} style={{
      width: '100%', background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 9, padding: '10px 14px', color: T.text, fontSize: 13,
      outline: 'none', cursor: 'pointer',
    }}>
      {children}
    </select>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary', size = 'md' }) {
  const styles = {
    primary: { background: 'linear-gradient(135deg,#6574f8,#7c6af7)', color: '#fff', border: 'none' },
    ghost:   { background: 'transparent', color: T.muted, border: `1px solid ${T.border}` },
    danger:  { background: 'rgba(251,113,133,0.1)', color: T.rose, border: '1px solid rgba(251,113,133,0.25)' },
  };
  const pad = size === 'sm' ? '6px 14px' : '9px 20px';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], borderRadius: 8, padding: pad,
      fontWeight: 600, fontSize: size === 'sm' ? 12 : 13,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      transition: 'opacity 0.15s', whiteSpace: 'nowrap',
    }}>
      {children}
    </button>
  );
}

function ChipBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 13px', borderRadius: 20, border: 'none',
      background: active ? T.accent : 'rgba(255,255,255,0.05)',
      color: active ? '#fff' : T.muted,
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: 38, height: 22, flexShrink: 0 }}>
        <input type="checkbox" checked={checked} onChange={onChange}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 11,
          background: checked ? T.accent : 'rgba(255,255,255,0.12)',
          transition: 'background 0.2s',
        }} />
        <span style={{
          position: 'absolute', left: checked ? 18 : 2, top: 2,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </span>
      {label && <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{label}</span>}
    </label>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 2, marginBottom: 24,
      background: T.card, borderRadius: 12, padding: 4,
      border: `1px solid ${T.border}`, width: 'fit-content',
    }}>
      {tabs.map(t => {
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            padding: '8px 18px', borderRadius: 9, border: 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: on ? 600 : 500,
            background: on ? 'rgba(101,116,248,0.18)' : 'transparent',
            color: on ? '#a5b4fc' : T.muted, transition: 'all 0.18s',
            whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Reusable Business + Service selector
function BusinessServiceSelector({
  businesses,
  selectedBusiness, onBusinessChange,
  services, loadingServices,
  selectedService, onServiceChange,
  serviceLabel = 'Select Service',
}) {
  return (
    <>
      <Card>
        <Label>Select Business</Label>
        <SelectInput value={selectedBusiness} onChange={e => onBusinessChange(e.target.value)}>
          <option value="">Choose a business…</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </SelectInput>
      </Card>

      {selectedBusiness && (
        <Card>
          <Label>{serviceLabel}</Label>
          {loadingServices ? (
            <Spinner message="Loading services…" />
          ) : services.length === 0 ? (
            <p style={{ color: T.muted, fontSize: 13, margin: '8px 0 0' }}>
              No services found — add services first
            </p>
          ) : (
            <SelectInput value={selectedService} onChange={e => onServiceChange(e.target.value)}>
              <option value="">Choose a service…</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>
              ))}
            </SelectInput>
          )}
        </Card>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKING HOURS TAB
// ══════════════════════════════════════════════════════════════════════════════
function WorkingHoursTab({ businesses }) {
  const [searchParams] = useSearchParams();
  const preSelectedBusinessId = searchParams.get('businessId');

  const [selectedBusiness, setSelectedBusiness] = useState(preSelectedBusinessId || '');
  const [services, setServices]                 = useState([]);
  const [selectedService, setSelectedService]   = useState('');
  const [hours, setHours]                       = useState({});
  const [loadingServices, setLoadingServices]   = useState(false);
  const [loadingHours, setLoadingHours]         = useState(false);
  const [saving, setSaving]                     = useState(null);
  const [msg, setMsg]                           = useState('');
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

  const handleSaveDay = async (day) => {
    if (!selectedService) return;
    const entry = hours[day] || {};
    const startTime = toTimeString(entry.startTime || '09:00');
    const endTime   = toTimeString(entry.endTime   || '18:00');
    const open      = entry.open !== false;
    setSaving(day); setMsg('');
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
      setMsg(`✓ ${DAY_LABELS[day]} saved!`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg(`✗ ${e.response?.data?.message || 'Failed'}`);
    } finally { setSaving(null); }
  };

  const updateDay = (day, field, value) =>
    setHours(p => ({
      ...p,
      [day]: { dayOfWeek: day, open: true, startTime: '09:00', endTime: '18:00', ...(p[day] || {}), [field]: value },
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              <SectionTitle sub="Apply one time range to several days at once">Bulk Apply</SectionTitle>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                <ChipBtn label="All"
                  active={DAYS.every(d => selectedDays.includes(d))}
                  onClick={() => setSelectedDays(DAYS.every(d => selectedDays.includes(d)) ? [] : [...DAYS])} />
                <ChipBtn label="Weekdays"
                  active={WEEKDAYS.every(d => selectedDays.includes(d))}
                  onClick={() => {
                    const all = WEEKDAYS.every(d => selectedDays.includes(d));
                    setSelectedDays(all ? selectedDays.filter(d => !WEEKDAYS.includes(d)) : [...new Set([...selectedDays, ...WEEKDAYS])]);
                  }} />
                {DAYS.map(day => (
                  <ChipBtn key={day} label={DAY_LABELS[day].slice(0, 3)}
                    active={selectedDays.includes(day)} onClick={() => toggleDay(day)} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 24 }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <Label>Start Time</Label>
                  <input type="time" value={bulkStart} onChange={e => setBulkStart(e.target.value)}
                    style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`,
                      borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 13, outline: 'none' }} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <Label>End Time</Label>
                  <input type="time" value={bulkEnd} onChange={e => setBulkEnd(e.target.value)}
                    style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`,
                      borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 13, outline: 'none' }} />
                </div>
                <Btn onClick={handleBulkApply} disabled={saving === 'bulk' || !selectedDays.length}>
                  {saving === 'bulk' ? 'Applying…' : `Apply to ${selectedDays.length} day${selectedDays.length !== 1 ? 's' : ''}`}
                </Btn>
              </div>
              <div style={{ borderTop: `1px solid ${T.border}`, marginBottom: 20 }} />
              <SectionTitle sub="Fine-tune each day individually">Individual Days</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DAYS.map(day => {
                  const h = hours[day] || {};
                  const isOpen = h.open !== false;
                  return (
                    <div key={day} style={{
                      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                      padding: '13px 16px', borderRadius: 10,
                      background: isOpen ? 'rgba(101,116,248,0.04)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isOpen ? 'rgba(101,116,248,0.15)' : T.border}`,
                      transition: 'all 0.2s',
                    }}>
                      <Toggle checked={isOpen} onChange={e => updateDay(day, 'open', e.target.checked)} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.text, minWidth: 90 }}>
                        {DAY_LABELS[day]}
                      </span>
                      {isOpen ? (
                        <>
                          <input type="time" value={toInputTime(h.startTime) || '09:00'}
                            onChange={e => updateDay(day, 'startTime', e.target.value)}
                            style={{ background: T.surface, border: `1px solid ${T.border}`,
                              borderRadius: 7, padding: '7px 10px', color: T.text, fontSize: 13, outline: 'none', maxWidth: 120 }} />
                          <span style={{ color: T.muted, fontSize: 12 }}>to</span>
                          <input type="time" value={toInputTime(h.endTime) || '18:00'}
                            onChange={e => updateDay(day, 'endTime', e.target.value)}
                            style={{ background: T.surface, border: `1px solid ${T.border}`,
                              borderRadius: 7, padding: '7px 10px', color: T.text, fontSize: 13, outline: 'none', maxWidth: 120 }} />
                          <Btn size="sm" onClick={() => handleSaveDay(day)} disabled={saving === day}>
                            {saving === day ? '…' : 'Save'}
                          </Btn>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>
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

// ══════════════════════════════════════════════════════════════════════════════
// HOLIDAYS TAB
// ══════════════════════════════════════════════════════════════════════════════
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
    if (!applyToAll && !selectedService) return setMsg('✗ Select a service or enable "Apply to All Services"');
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
      setHolidays(p => [...p, r.data].sort((a, b) => a.date.localeCompare(b.date)));
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Business selector */}
      <Card>
        <Label>Select Business</Label>
        <SelectInput value={selectedBusiness} onChange={e => handleBusinessChange(e.target.value)}>
          <option value="">Choose a business…</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </SelectInput>
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
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: 10, marginBottom: 16,
              background: applyToAll ? 'rgba(101,116,248,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${applyToAll ? 'rgba(101,116,248,0.2)' : T.border}`,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: T.text }}>
                  Apply to All Services
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: T.muted }}>
                  Blocks bookings across every service in this business on the selected date
                </p>
              </div>
              <Toggle checked={applyToAll} onChange={e => { setApplyToAll(e.target.checked); setSelectedService(''); }} />
            </div>

            {/* Service selector when not applying to all */}
            {!applyToAll && (
              <div style={{ marginBottom: 16 }}>
                <Label>Select Service</Label>
                {loadingServices ? <Spinner message="Loading services…" /> : services.length === 0 ? (
                  <p style={{ color: T.muted, fontSize: 13, margin: '8px 0 0' }}>No services found</p>
                ) : (
                  <SelectInput value={selectedService} onChange={e => setSelectedService(e.target.value)}>
                    <option value="">Choose a service…</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (₹{s.price})</option>
                    ))}
                  </SelectInput>
                )}
              </div>
            )}

            {/* Date + Reason + Button */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 160px' }}>
                <Label> Date</Label>
                <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 13, outline: 'none' }} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Label>Reason (optional)</Label>
                <input type="text" value={reason} placeholder="e.g. Diwali, Owner vacation…"
                  onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 13, outline: 'none' }} />
              </div>
              <Btn onClick={handleAdd} disabled={saving}>
                {saving ? 'Adding…' : '+ Add Holiday'}
              </Btn>
            </div>
          </Card>

          {/* Holidays list */}
          <Card>
            <SectionTitle sub={`${holidays.length} holiday${holidays.length !== 1 ? 's' : ''} scheduled`}>
              Scheduled Holidays
            </SectionTitle>
            {loading ? <Spinner message="Loading…" /> : holidays.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                <p style={{ color: T.muted, fontSize: 13 }}>No holidays scheduled. Your business is open every day.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {holidays.map(h => {
                  const d = new Date(h.date + 'T00:00:00');
                  const isPast = h.date < today;
                  const monthName = d.toLocaleString('default', { month: 'short' }).toUpperCase();
                  const dayAbbr   = d.toLocaleDateString('en-IN', { weekday: 'short' });
                  const fullDate  = d.toLocaleDateString('en-IN', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  });
                  return (
                    <div key={h.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 10, gap: 12, flexWrap: 'wrap',
                      background: isPast ? 'rgba(255,255,255,0.02)' : 'rgba(251,191,36,0.06)',
                      border: `1px solid ${isPast ? T.border : 'rgba(251,191,36,0.2)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Calendar widget */}
                        <div style={{
                          width: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                          border: `1px solid ${isPast ? T.border : 'rgba(251,191,36,0.3)'}`,
                        }}>
                          <div style={{ background: isPast ? T.surface : T.amber, padding: '3px 0', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: 9, fontWeight: 700,
                              color: isPast ? T.muted : '#0d0f19', letterSpacing: '0.06em' }}>
                              {monthName}
                            </p>
                          </div>
                          <div style={{
                            background: isPast ? 'rgba(255,255,255,0.02)' : 'rgba(251,191,36,0.1)',
                            padding: '4px 0', textAlign: 'center',
                          }}>
                            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1,
                              color: isPast ? T.muted : T.amber }}>
                              {d.getDate()}
                            </p>
                            <p style={{ margin: 0, fontSize: 9, color: T.muted, fontWeight: 600 }}>{dayAbbr}</p>
                          </div>
                        </div>

                        {/* Info */}
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isPast ? T.muted : T.text }}>
                            {fullDate}
                          </p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                              background: h.allServices ? 'rgba(101,116,248,0.12)' : 'rgba(52,211,153,0.1)',
                              color: h.allServices ? '#a5b4fc' : '#34d399',
                            }}>
                              {h.allServices ? '🏢 All Services' : `⚙ ${h.serviceName || 'Service'}`}
                            </span>
                            {h.reason && (
                              <span style={{ fontSize: 11, color: T.muted }}>{h.reason}</span>
                            )}
                            {isPast && (
                              <span style={{ fontSize: 10, color: T.muted, fontStyle: 'italic' }}>Past</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Btn variant="danger" size="sm" onClick={() => handleDelete(h.id)}>Remove</Btn>
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

// ══════════════════════════════════════════════════════════════════════════════
// PHOTOS TAB
// ══════════════════════════════════════════════════════════════════════════════
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '100%' }}>
            <img src={`${BASE_URL}${lightbox.url}`} alt={lightbox.caption || ''}
              style={{ width: '100%', borderRadius: 12, maxHeight: '80vh', objectFit: 'contain' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <p style={{ margin: 0, color: '#aaa', fontSize: 13 }}>{lightbox.caption || 'No caption'}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="danger" size="sm" onClick={() => handleDelete(lightbox.id)}>Delete</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setLightbox(null)}>Close</Btn>
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
        serviceLabel="Select Service to manage photos"
      />

      {selectedService && (
        <>
          {/* Upload card */}
          <Card>
            <SectionTitle sub={`${photos.length} / ${MAX_PHOTOS} photos for this service`}>
              Upload Photos
            </SectionTitle>
            <Toast msg={msg} />

            {atLimit && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 12,
                background: 'rgba(251,191,36,0.08)', color: T.amber,
                border: '1px solid rgba(251,191,36,0.2)',
              }}>
                ⚠ Maximum {MAX_PHOTOS} photos reached per service. Delete a photo to upload a new one.
              </div>
            )}

            {!atLimit && (
              <>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                  style={{
                    border: `2px dashed ${preview ? T.accent : T.border}`, borderRadius: 12,
                    padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                    background: preview ? 'rgba(101,116,248,0.04)' : 'transparent',
                    transition: 'all 0.2s', marginBottom: 14,
                  }}
                >
                  {preview ? (
                    <img src={preview} alt="preview"
                      style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
                  ) : (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                      <p style={{ margin: 0, fontSize: 13, color: T.muted }}>Click or drag & drop to upload</p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: T.muted }}>
                        JPEG, PNG, WebP — max {MAX_PHOTOS} photos per service
                      </p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />

                {selectedFile && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <Label>Caption (optional)</Label>
                      <input type="text" value={caption} placeholder="Describe this photo…"
                        onChange={e => setCaption(e.target.value)}
                        style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`,
                          borderRadius: 8, padding: '9px 12px', color: T.text, fontSize: 13, outline: 'none' }} />
                    </div>
                    <Btn onClick={handleUpload} disabled={uploading}>
                      {uploading ? 'Uploading…' : 'Upload Photo'}
                    </Btn>
                    <Btn variant="ghost" onClick={() => {
                      setSelectedFile(null); setPreview(null); setCaption('');
                      if (fileRef.current) fileRef.current.value = '';
                    }}>
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
            {loading ? <Spinner message="Loading photos…" /> : photos.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                <p style={{ color: T.muted, fontSize: 13 }}>No photos yet. Upload your first photo above.</p>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: T.muted }}>{photos.length} of {MAX_PHOTOS} photos</span>
                    <span style={{ fontSize: 11, color: atLimit ? T.amber : T.muted }}>
                      {atLimit ? 'Limit reached' : `${MAX_PHOTOS - photos.length} slots remaining`}
                    </span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${(photos.length / MAX_PHOTOS) * 100}%`,
                      background: atLimit ? T.amber : T.accent,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
                  {photos.map(photo => (
                    <div key={photo.id} style={{
                      position: 'relative', borderRadius: 10, overflow: 'hidden',
                      aspectRatio: '1', cursor: 'pointer', background: T.surface,
                    }} onClick={() => setLightbox(photo)}>
                      <img src={`${BASE_URL}${photo.url}`} alt={photo.caption || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: 0, transition: 'opacity 0.2s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                      >
                        {photo.caption && (
                          <p style={{ margin: 0, fontSize: 11, color: '#fff',
                            textAlign: 'center', padding: '0 8px' }}>
                            {photo.caption}
                          </p>
                        )}
                        <button onClick={e => { e.stopPropagation(); handleDelete(photo.id); }}
                          style={{ background: 'rgba(251,113,133,0.9)', color: '#fff', border: 'none',
                            borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
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

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
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
    <div style={{ minHeight: '100vh', background: T.bg, padding: '32px 20px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800,
            color: T.text, letterSpacing: '-0.02em' }}>
            Business Settings
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: T.muted }}>
            Manage working hours, holidays, and photos for your businesses
          </p>
        </div>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'hours'    && <WorkingHoursTab businesses={businesses} />}
        {tab === 'holidays' && <HolidaysTab     businesses={businesses} />}
        {tab === 'photos'   && <PhotosTab       businesses={businesses} />}
      </div>
    </div>
  );
}