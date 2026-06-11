import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getServicesByBusiness, formatServiceLocation, serviceDropdownLabel } from '../api/services';
import { getAvailableSlots } from '../api/slots';
import { bookAppointment } from '../api/appointments';
import { createPaymentOrder, verifyPayment } from '../api/payments';
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

// ── Step indicator ─────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = ['Select', 'Review', 'Payment', 'Done'];
  const idx   = { SELECT: 0, REVIEW: 1, PAYING: 2, DONE: 3 };
  const cur   = idx[step] ?? 0;
  return (
    <div className="bk-steps">
      {steps.map((label, i) => (
        <div key={i} className={`bk-step ${i < cur ? 'bk-step--done' : i === cur ? 'bk-step--active' : ''}`}>
          <div className="bk-step-circle">{i < cur ? '✓' : i + 1}</div>
          <div className="bk-step-label">{label}</div>
          {i < steps.length - 1 && <div className="bk-step-line" />}
        </div>
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

  // ── Existing state ──────────────────────────────────────────────────────
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

  // ── New payment state ───────────────────────────────────────────────────
  const [step,       setStep]       = useState('SELECT'); // SELECT | REVIEW | PAYING | DONE
  const [bookedAppt, setBookedAppt] = useState(null);
  const [orderData,  setOrderData]  = useState(null);    // Razorpay order response

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
      setSlots([]); setSlotsError(''); return;
    }
    const day = dateToDayName(selectedDate);
    setComputedDay(day);
    const currentService = services.find(s => String(s.id) === String(selectedService));
    const duration = currentService?.duration || currentService?.durationMinutes || 30;

    setSlotsLoading(true); setSlotsError(''); setSlots([]); setSelectedSlot('');
    getAvailableSlots(selectedService, selectedDate, duration)
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : [];
        setSlots(data);
        if (data.length === 0)
          setSlotsError(`No slots available on ${day} (${selectedDate})`);
      })
      .catch(e => {
        const msg = e.response?.data?.message ||
          (typeof e.response?.data === 'string' ? e.response.data : null) ||
          'Could not fetch time slots. Ensure working hours are set for this day.';
        setSlotsError(msg); setSlots([]);
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedService, services]);

  const currentService = services.find(s => String(s.id) === String(selectedService));
  const depositAmount  = currentService
    ? ((currentService.price * 30) / 100).toFixed(2)
    : '0.00';
  const remainingAmount = currentService
    ? (currentService.price * 0.70).toFixed(2)
    : '0.00';

  const getSlotTime  = slot => {
    if (typeof slot === 'string') return slot;
    if (slot?.time) return typeof slot.time === 'string'
      ? slot.time.slice(0, 5) : slot.time;
    return '';
  };
  const isSlotBooked = slot => typeof slot === 'object' && slot?.booked === true;

  // ── Step 1 → 2: Validate selection, move to Review ─────────────────────
  const handleProceedToReview = () => {
    if (!selectedDate || !selectedSlot || !selectedService)
      return setError('Please select a service, date and time slot');
    setError('');
    setStep('REVIEW');
  };

  // ── Step 2 → 3: Book appointment + create Razorpay order ───────────────
  const handleConfirmAndPay = async () => {
    setLoading(true); setError('');
    try {
      // 1. Create appointment (status = PENDING, paymentStatus = PENDING_PAYMENT)
      const apptRes = await bookAppointment({
        businessId:      parseInt(businessId),
        serviceId:       parseInt(selectedService),
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot + ':00',
      });
      const appointment = apptRes.data;
      setBookedAppt(appointment);

      // 2. Create Razorpay order for the deposit
      const orderRes = await createPaymentOrder(appointment.id);
      const order    = orderRes.data;
      setOrderData(order);

      setStep('PAYING');

      // 3. Open Razorpay checkout popup
      openRazorpayCheckout(order, appointment);

    } catch (e) {
      setError(e.response?.data?.message || 'Booking failed. Please try again.');
      setStep('REVIEW');
    } finally {
      setLoading(false);
    }
  };

  // ── Razorpay checkout ───────────────────────────────────────────────────
  const openRazorpayCheckout = (order, appointment) => {
    if (!window.Razorpay) {
      setError('Payment system not loaded. Please refresh the page and try again.');
      setStep('REVIEW');
      return;
    }

    const options = {
      key:         order.keyId,
      amount:      Math.round(parseFloat(order.depositAmount) * 100), // paise
      currency:    order.currency || 'INR',
      name:        'BookEase',
      description: `Deposit for ${order.serviceName}`,
      order_id:    order.orderId,
      prefill: {
        name:  order.customerName  || '',
        email: order.customerEmail || '',
      },
      theme:   { color: '#6366f1' },
      handler: async (response) => {
        // Payment captured by Razorpay — verify signature on backend
        try {
          await verifyPayment({
            razorpayOrderId:   response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            appointmentId:     appointment.id,
          });
          setStep('DONE');
        } catch {
          setError('Payment received but verification failed. Please contact support with your appointment ID: ' + appointment.id);
          setStep('REVIEW');
        }
      },
      modal: {
        ondismiss: () => {
          setError('Payment was cancelled. Your slot is still temporarily reserved — you can retry payment.');
          setStep('REVIEW');
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', () => {
      setError('Payment failed. Please try again with a different payment method.');
      setStep('REVIEW');
    });
    rzp.open();
  };

  // ── DONE screen ─────────────────────────────────────────────────────────
  if (step === 'DONE') {
    return (
      <div className="page-container narrow">
        <div className="booking-biz-banner">
          <div className="booking-biz-banner-left">
            <div className="booking-biz-avatar">
              {initialBusiness?.name?.[0]?.toUpperCase() || '🏢'}
            </div>
            <div>
              <div className="booking-biz-banner-name">
                {initialBusiness?.name || 'BookEase'}
              </div>
            </div>
          </div>
        </div>
        <div className="card bk-done-card">
          <div className="bk-done-icon">🎉</div>
          <h2 className="bk-done-title">Booking Confirmed!</h2>
          <p className="bk-done-sub">
            Your deposit has been received and appointment is confirmed.
            Check your email for confirmation details.
          </p>
          <div className="booking-summary" style={{ marginTop: 24 }}>
            <div className="booking-summary-header">Booking Summary</div>
            <div className="booking-summary-row">
              <span>Service</span>
              <span>{currentService?.name}</span>
            </div>
            <div className="booking-summary-row">
              <span>Date</span>
              <span>{selectedDate} ({computedDay})</span>
            </div>
            <div className="booking-summary-row">
              <span>Time</span>
              <span>{selectedSlot}</span>
            </div>
            <div className="booking-summary-row">
              <span>Deposit Paid</span>
              <span className="booking-price">₹{depositAmount}</span>
            </div>
            <div className="booking-summary-row">
              <span>Pay at Service</span>
              <span>₹{remainingAmount}</span>
            </div>
          </div>
          <button className="btn btn-primary btn-full"
            style={{ marginTop: 24 }}
            onClick={() => navigate('/my-appointments')}>
            View My Appointments →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container narrow">

      {/* ── Business banner ── */}
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

      {/* ── Step indicator ── */}
      <StepIndicator step={step} />

      {/* ── SELECT step ── */}
      {step === 'SELECT' && (
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}

          {/* Service */}
          <div className="form-group">
            <label className="form-label">
              Select Service {loadingServices && '(loading...)'}
            </label>
            {services.length > 1 && (
              <div className="booking-service-hint">
                💡 Location is shown to help you identify the right branch
              </div>
            )}
            {services.length === 0 && !loadingServices ? (
              <div className="alert alert-info">No services available.</div>
            ) : (
              <select className="form-select" value={selectedService}
                onChange={e => {
                  setSelectedService(e.target.value);
                  setSelectedSlot(''); setSlots([]); setSlotsError('');
                }}>
                <option value="">Choose a service...</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{serviceDropdownLabel(s)}</option>
                ))}
              </select>
            )}
            {currentService && (
              <div className="booking-service-meta">
                <span className="booking-service-meta-chip">₹{currentService.price}</span>
                {(currentService.duration || currentService.durationMinutes) && (
                  <span className="booking-service-meta-chip">
                    ⏱ {currentService.duration || currentService.durationMinutes} min
                  </span>
                )}
                {currentService.serviceType && (
                  <span className={`booking-service-meta-chip booking-service-type-${
                    currentService.serviceType.toLowerCase()}`}>
                    {currentService.serviceType === 'CONSULTATION'
                      ? '💬 Consultation' : '⏱ Fixed'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          {selectedService && (
            <div className="form-group">
              <label className="form-label">Select Date</label>
              <input className="form-input" type="date" min={today}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ colorScheme: 'dark' }} />
              {selectedDate && computedDay && (
                <div className="booking-day-label">
                  📆 {computedDay} · {selectedDate}
                </div>
              )}
            </div>
          )}

          {/* Slots */}
          {selectedDate && (
            <div className="form-group">
              <label className="form-label">Available Time Slots</label>
              <div className="slots-area">
                {slotsLoading ? <SlotsSkeleton /> :
                 slotsError   ? (
                  <div className="slots-empty-msg"><span>📭</span> {slotsError}</div>
                 ) : slots.length > 0 ? (
                  <div className="slots-grid">
                    {slots.map((slot, i) => {
                      const time   = getSlotTime(slot);
                      const booked = isSlotBooked(slot);
                      return (
                        <button key={time || i} type="button"
                          className={`slot-chip${booked ? ' slot-booked' : ''}${selectedSlot === time ? ' selected' : ''}`}
                          onClick={() => !booked && time && setSelectedSlot(time)}
                          disabled={booked}>
                          {time}
                        </button>
                      );
                    })}
                  </div>
                 ) : null}
              </div>
            </div>
          )}

          {/* Deposit preview */}
          {selectedSlot && currentService && (
            <div className="bk-deposit-preview">
              <div className="bk-deposit-row">
                <span>Total Service Price</span>
                <strong>₹{currentService.price}</strong>
              </div>
              <div className="bk-deposit-row bk-deposit-row--highlight">
                <span>💳 Deposit to Pay Now (30%)</span>
                <strong className="bk-deposit-amount">₹{depositAmount}</strong>
              </div>
              <div className="bk-deposit-row bk-deposit-row--muted">
                <span>Pay at Service (70%)</span>
                <span>₹{remainingAmount}</span>
              </div>
            </div>
          )}

          <button className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: 20 }}
            onClick={handleProceedToReview}
            disabled={!selectedDate || !selectedSlot || !selectedService}>
            Review & Pay Deposit →
          </button>
        </div>
      )}

      {/* ── REVIEW step ── */}
      {step === 'REVIEW' && currentService && (
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}

          <h3 className="bk-review-title">Confirm Your Booking</h3>

          <div className="booking-summary">
            <div className="booking-summary-header">Booking Details</div>
            <div className="booking-summary-row">
              <span>Business</span>
              <span>{initialBusiness?.name || '—'}</span>
            </div>
            <div className="booking-summary-row">
              <span>Service</span>
              <span>{currentService.name}</span>
            </div>
            <div className="booking-summary-row">
              <span>Location</span>
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
                <span>{currentService.duration || currentService.durationMinutes} min</span>
              </div>
            )}
            <div className="booking-summary-row">
              <span>Total Price</span>
              <span>₹{currentService.price}</span>
            </div>
            <div className="booking-summary-row bk-summary-deposit">
              <span>💳 Deposit Now (30%)</span>
              <span className="booking-price">₹{depositAmount}</span>
            </div>
            <div className="booking-summary-row">
              <span>Pay at Service (70%)</span>
              <span>₹{remainingAmount}</span>
            </div>
          </div>

          {/* Cancellation policy */}
          <div className="bk-policy-box">
            <div className="bk-policy-title">📋 Cancellation & Refund Policy</div>
            <div className="bk-policy-row bk-policy-row--green">
              <span>✅</span>
              <span>Cancel <strong>48+ hours</strong> before → Full refund</span>
            </div>
            <div className="bk-policy-row bk-policy-row--yellow">
              <span>⚠️</span>
              <span>Cancel <strong>24–48 hours</strong> before → 50% refund</span>
            </div>
            <div className="bk-policy-row bk-policy-row--red">
              <span>❌</span>
              <span>Cancel <strong>within 24 hours</strong> → No refund</span>
            </div>
            <div className="bk-policy-row">
              <span>🔄</span>
              <span>Reschedule allowed up to 24 hrs before (max 2 times, no extra charge)</span>
            </div>
          </div>

          <div className="bk-review-actions">
            <button className="btn btn-secondary"
              onClick={() => { setStep('SELECT'); setError(''); }}
              disabled={loading}>
              ← Back
            </button>
            <button className="btn btn-primary bk-pay-btn"
              onClick={handleConfirmAndPay} disabled={loading}>
              {loading ? '⏳ Processing…' : `💳 Pay ₹${depositAmount} Deposit`}
            </button>
          </div>
        </div>
      )}

      {/* ── PAYING step (Razorpay popup is open) ── */}
      {step === 'PAYING' && (
        <div className="card bk-paying-card">
          <div className="bk-paying-spinner">⏳</div>
          <h3 className="bk-paying-title">Complete Payment</h3>
          <p className="bk-paying-sub">
            Razorpay checkout is open in the popup window.
            Complete your payment there to confirm your booking.
          </p>
          <p className="bk-paying-note">
            Do not close this tab.
          </p>
        </div>
      )}

    </div>
  );
}