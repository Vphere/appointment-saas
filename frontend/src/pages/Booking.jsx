import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getServicesByBusiness, formatServiceLocation, serviceDropdownLabel } from '../api/services';
import { getAvailableSlots } from '../api/slots';
import { bookAppointment } from '../api/appointments';
import Spinner from '../components/Spinner';
import './Booking.css';

function dateToDayName(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase();
}

function SlotsSkeleton() {
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
  const location       = useLocation();
  const navigate       = useNavigate();

  const initialBusiness      = location.state?.business || null;
  const initialServices      = location.state?.services  || [];
  const preSelectedServiceId = location.state?.preSelectedServiceId;

  const [services, setServices]               = useState(initialServices);
  const [selectedService, setSelectedService] = useState(
    preSelectedServiceId ? String(preSelectedServiceId) : ''
  );
  const [selectedDate, setSelectedDate]       = useState('');
  const [computedDay, setComputedDay]         = useState('');
  const [slots, setSlots]                     = useState([]);
  const [selectedSlot, setSelectedSlot]       = useState('');
  const [loadingServices, setLoadingServices] = useState(false);
  const [slotsLoading, setSlotsLoading]       = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [slotsError, setSlotsError]           = useState('');
  const [success, setSuccess]                 = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (services.length === 0 && businessId) {
      setLoadingServices(true);
      getServicesByBusiness(businessId)
        .then(r => setServices(Array.isArray(r.data) ? r.data : []))
        .catch(() => {})
        .finally(() => setLoadingServices(false));
    }
  }, [businessId]);

  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setSlots([]);
      setSlotsError('');
      return;
    }

    const day = dateToDayName(selectedDate);
    setComputedDay(day);

    const currentService = services.find(s => String(s.id) === String(selectedService));
    const duration = currentService?.duration || currentService?.durationMinutes || 30;

    setSlotsLoading(true);
    setSlotsError('');
    setSlots([]);
    setSelectedSlot('');

    getAvailableSlots(selectedService, selectedDate, duration)
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : [];
        setSlots(data);
        if (data.length === 0) {
          setSlotsError(`No slots available on ${day} (${selectedDate})`);
        }
      })
      .catch(e => {
        const msg =
          e.response?.data?.message ||
          (typeof e.response?.data === 'string' ? e.response.data : null) ||
          'Could not fetch time slots. Ensure working hours are set for this day.';
        setSlotsError(msg);
        setSlots([]);
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedService, services]);

  const currentService = services.find(
    s => String(s.id) === String(selectedService)
  );

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot || !selectedService) {
      return setError('Please select a service, date and time slot');
    }
    setError('');
    setLoading(true);
    try {
      await bookAppointment({
        businessId:      parseInt(businessId),
        serviceId:       parseInt(selectedService),
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot + ':00',
      });
      setSuccess(true);
      setTimeout(() => navigate('/my-appointments'), 2500);
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

  const getSlotTime = slot => {
    if (typeof slot === 'string') return slot;
    if (slot?.time) return typeof slot.time === 'string'
      ? slot.time.slice(0, 5)
      : slot.time;
    return '';
  };

  const isSlotBooked = slot =>
    typeof slot === 'object' && slot?.booked === true;

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

      {/* ── Business info banner ── */}
      <div className="booking-biz-banner">
        <div className="booking-biz-banner-left">
          <div className="booking-biz-avatar">
            {initialBusiness?.name?.[0]?.toUpperCase() || '🏢'}
          </div>
          <div>
            <div className="booking-biz-banner-name">
              {initialBusiness?.name || 'Book Appointment'}
            </div>
            {initialBusiness?.city && (
              <div className="booking-biz-banner-location">
                📍 {[initialBusiness.city, initialBusiness.state]
                      .filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>
        <div className="booking-biz-banner-right">
          <div className="booking-biz-banner-label">Appointment Booking</div>
        </div>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Service Selection ── */}
        <div className="form-group">
          <label className="form-label">
            Select Service {loadingServices && '(loading...)'}
          </label>

          {/* Helper text explaining why location is shown */}
          {services.length > 1 && (
            <div className="booking-service-hint">
              💡 Location is shown to help you identify the right branch
            </div>
          )}

          {services.length === 0 && !loadingServices ? (
            <div className="alert alert-info">
              No services available for this business.
            </div>
          ) : (
            <select
              className="form-select"
              value={selectedService}
              onChange={e => {
                setSelectedService(e.target.value);
                setSelectedSlot('');
                setSlots([]);
                setSlotsError('');
              }}
            >
              <option value="">Choose a service...</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {serviceDropdownLabel(s)}
                </option>
              ))}
            </select>
          )}

          {/* Show selected service's price + duration as a pill below the dropdown */}
          {currentService && (
            <div className="booking-service-meta">
              <span className="booking-service-meta-chip">
                ₹{currentService.price}
              </span>
              {(currentService.duration || currentService.durationMinutes) && (
                <span className="booking-service-meta-chip">
                  ⏱ {currentService.duration || currentService.durationMinutes} min
                </span>
              )}
              {currentService.serviceType && (
                <span className={`booking-service-meta-chip booking-service-type-${
                  currentService.serviceType.toLowerCase()
                }`}>
                  {currentService.serviceType === 'CONSULTATION'
                    ? '💬 Consultation'
                    : '⏱ Fixed'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Date Selection ── */}
        {selectedService && (
          <div className="form-group">
            <label className="form-label">Select Date</label>
            <input
              className="form-input"
              type="date"
              min={today}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
            {selectedDate && computedDay && (
              <div className="booking-day-label">
                📆 {computedDay} · {selectedDate}
              </div>
            )}
          </div>
        )}

        {/* ── Time Slots ── */}
        {selectedDate && (
          <div className="form-group">
            <label className="form-label">Available Time Slots</label>
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
                        className={`slot-chip
                          ${booked ? ' slot-booked' : ''}
                          ${selectedSlot === time ? ' selected' : ''}`}
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
        {selectedSlot && currentService && (
          <div className="booking-summary">
            <div className="booking-summary-header">Booking Summary</div>

            <div className="booking-summary-row">
              <span>Service</span>
              <span>{currentService.name}</span>
            </div>

            <div className="booking-summary-row">
              <span>Branch</span>
              <span>{formatServiceLocation(currentService)}</span>
            </div>

            <div className="booking-summary-row">
              <span>Date</span>
              <span>{selectedDate} ({computedDay})</span>
            </div>

            <div className="booking-summary-row">
              <span>Time</span>
              <span>{selectedSlot}</span>
            </div>

            {(currentService.duration || currentService.durationMinutes) && (
              <div className="booking-summary-row">
                <span>Duration</span>
                <span>
                  {currentService.duration || currentService.durationMinutes} min
                </span>
              </div>
            )}

            {currentService.price && (
              <div className="booking-summary-row booking-summary-total">
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
          disabled={
            loading || !selectedDate || !selectedSlot || !selectedService
          }
        >
          {loading ? '⏳ Booking...' : '📅 Confirm Booking'}
        </button>
      </div>
    </div>
  );
}