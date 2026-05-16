import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getServicesByBusiness } from '../api/services';
import { getAvailableSlots } from '../api/slots';
import { bookAppointment } from '../api/appointments';
import Spinner from '../components/Spinner';
import './Booking.css';

// YYYY-MM-DD → uppercase day name e.g. "MONDAY"
function dateToDayName(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

// Shimmer skeleton that mimics ~6 slot chips
function SlotsSkeleton() {
  // Vary widths slightly so it looks natural
  const widths = [64, 56, 72, 56, 64, 56];
  return (
    <div className="slots-skeleton">
      {widths.map((w, i) => (
        <div key={i} className="slots-skeleton-chip" style={{ width: w }} />
      ))}
    </div>
  );
}

export default function Booking() {
  const { businessId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const initialBusiness      = location.state?.business || null;
  const initialServices      = location.state?.services  || [];
  const preSelectedServiceId = location.state?.preSelectedServiceId;

  const [services, setServices]             = useState(initialServices);
  const [selectedService, setSelectedService] = useState(
    preSelectedServiceId ? String(preSelectedServiceId) : ''
  );
  const [selectedDate, setSelectedDate]     = useState('');
  const [computedDay, setComputedDay]       = useState('');
  const [slots, setSlots]                   = useState([]);
  const [selectedSlot, setSelectedSlot]     = useState('');
  const [loadingServices, setLoadingServices] = useState(false);
  const [slotsLoading, setSlotsLoading]     = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [slotsError, setSlotsError]         = useState('');
  const [success, setSuccess]               = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Fetch services if not passed via navigation state
  useEffect(() => {
    if (services.length === 0 && businessId) {
      setLoadingServices(true);
      getServicesByBusiness(businessId)
        .then((r) => setServices(Array.isArray(r.data) ? r.data : []))
        .catch(() => {})
        .finally(() => setLoadingServices(false));
    }
  }, [businessId]);

  // Fetch slots whenever date / service changes
  useEffect(() => {
    if (!selectedDate || !businessId) {
      setSlots([]);
      setSlotsError('');
      return;
    }

    const day = dateToDayName(selectedDate);
    setComputedDay(day);

    const currentService = services.find((s) => String(s.id) === String(selectedService));
    const duration = currentService?.duration || currentService?.durationMinutes || 30;

    console.log('[Booking] Fetching slots:', { businessId, date: selectedDate, duration, day });

    setSlotsLoading(true);
    setSlotsError('');
    setSlots([]);
    setSelectedSlot('');

    getAvailableSlots(selectedService, selectedDate, duration)
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        console.log('[Booking] Slots received:', data);
        setSlots(data);
        if (data.length === 0) {
          setSlotsError(`No slots available on ${day} (${selectedDate})`);
        }
      })
      .catch((e) => {
        const msg =
          e.response?.data?.message ||
          (typeof e.response?.data === 'string' ? e.response.data : null) ||
          'Could not fetch time slots. Ensure working hours are set for this day.';
        console.error('[Booking] Slots error:', e.response?.data || e.message);
        setSlotsError(msg);
        setSlots([]);
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, businessId, selectedService, services]);

  const currentService = services.find((s) => String(s.id) === String(selectedService));

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot || !selectedService) {
      return setError('Please select a service, date and time slot');
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        businessId: parseInt(businessId),
        serviceId: parseInt(selectedService),
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot + ':00',
      };
      console.log('[Booking] Booking appointment:', payload);
      await bookAppointment(payload);
      setSuccess(true);
      setTimeout(() => navigate('/my-appointments'), 2000);
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        (typeof e.response?.data === 'string' ? e.response.data : null) ||
        'Failed to book appointment';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getSlotTime = (slot) => {
    if (typeof slot === 'string') return slot;
    if (slot?.time) return typeof slot.time === 'string' ? slot.time.slice(0, 5) : slot.time;
    return '';
  };
  const isSlotBooked = (slot) => typeof slot === 'object' && slot?.booked === true;

  if (success) {
    return (
      <div className="booking-success">
        <div className="booking-success-icon">🎉</div>
        <h2>Appointment Booked!</h2>
        <p>Redirecting to your appointments...</p>
      </div>
    );
  }

  return (
    <div className="page-container narrow">
      <div className="booking-header">
        <h1 className="page-title">Book Appointment</h1>
        {initialBusiness?.name && (
          <p className="page-subtitle">
            at <strong className="booking-biz-name">{initialBusiness.name}</strong>
            {initialBusiness.city && <span> · {initialBusiness.city}</span>}
          </p>
        )}
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Service Selection ── */}
        <div className="form-group">
          <label className="form-label">
            Select Service {loadingServices ? '(loading...)' : ''}
          </label>
          {services.length === 0 && !loadingServices ? (
            <div className="alert alert-info">No services available for this business.</div>
          ) : (
            <select
              className="form-select"
              value={selectedService}
              onChange={(e) => { setSelectedService(e.target.value); setSelectedSlot(''); }}
            >
              <option value="">Choose a service...</option>
              {services.map((s) => {
                const dur = s.duration || s.durationMinutes;
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} — ₹{s.price}{dur ? ` (${dur} min)` : ''}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* ── Date Selection ── */}
        <div className="form-group">
          <label className="form-label">Select Date</label>
          <input
            className="form-input"
            type="date"
            min={today}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
          {selectedDate && computedDay && (
            <div className="booking-day-label">
              📆 {computedDay} · {selectedDate}
            </div>
          )}
        </div>

        {/* ── Time Slots ──
            Always render the wrapper once a date is picked so the card
            height is reserved and no layout jump occurs.
        ── */}
        {selectedDate && (
          <div className="form-group">
            <label className="form-label">Available Time Slots</label>

            {/* Fixed-height area — prevents card from jumping */}
            <div className="slots-area">
              {slotsLoading ? (
                <SlotsSkeleton />
              ) : slotsError ? (
                <div className="slots-empty-msg">
                  <span>📭</span> {slotsError}
                </div>
              ) : slots.length > 0 ? (
                <div className="slots-grid">
                  {slots.map((slot, i) => {
                    const time   = getSlotTime(slot);
                    const booked = isSlotBooked(slot);
                    return (
                      <button
                        key={time || i}
                        className={`slot-chip${booked ? ' slot-booked' : ''}${selectedSlot === time ? ' selected' : ''}`}
                        onClick={() => !booked && time && setSelectedSlot(time)}
                        disabled={booked}
                        type="button"
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ── Booking Summary ── */}
        {selectedSlot && (
          <div className="booking-summary">
            {currentService && (
              <div className="booking-summary-row">
                <span>Service</span>
                <span>{currentService.name}</span>
              </div>
            )}
            <div className="booking-summary-row">
              <span>Date</span>
              <span>{selectedDate} ({computedDay})</span>
            </div>
            <div className="booking-summary-row">
              <span>Time</span>
              <span>{selectedSlot}</span>
            </div>
            {(currentService?.duration || currentService?.durationMinutes) && (
              <div className="booking-summary-row">
                <span>Duration</span>
                <span>{currentService.duration || currentService.durationMinutes} min</span>
              </div>
            )}
            {currentService?.price && (
              <div className="booking-summary-row">
                <span>Total</span>
                <span className="booking-price">₹{currentService.price}</span>
              </div>
            )}
          </div>
        )}

        <button
          className="btn btn-primary btn-full btn-lg"
          style={{ marginTop: 20 }}
          onClick={handleBook}
          disabled={loading || !selectedDate || !selectedSlot || !selectedService}
        >
          {loading ? '⏳ Booking...' : '📅 Confirm Booking'}
        </button>
      </div>
    </div>
  );
}