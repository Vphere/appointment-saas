import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getServicesByBusiness, formatServiceLocation, serviceDropdownLabel } from '../api/services';
import { getAvailableSlots } from '../api/slots';
import { bookAppointment } from '../api/appointments';
import { createPaymentOrder, verifyPayment } from '../api/payments';
import { getBusinessById } from '../api/business';
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

// Formats "2026-06-25" → "25 Jun 2026"
function formatDateNice(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

export default function Booking() {
  const { businessId } = useParams();
  const location       = useLocation();
  const navigate       = useNavigate();

  // ── State passed from MyAppointments "Complete Deposit Payment" ───────────
  const pendingAppt = location.state?.pendingAppointment || null;  // existing unpaid appointment
  const isPendingRetry = !!pendingAppt;                            // true = skip-to-review mode


  const initialServices      = location.state?.services  || [];
  const preSelectedServiceId = location.state?.preSelectedServiceId;

  // ── Normal booking state ───────────────────────────────────────────────────
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

  // ── Payment state ──────────────────────────────────────────────────────────
  // If we're in pending-retry mode, we already have a booked appointment
  const [step,       setStep]       = useState(isPendingRetry ? 'REVIEW' : 'SELECT');
  const [bookedAppt, setBookedAppt] = useState(isPendingRetry ? pendingAppt : null);
  const [orderData,  setOrderData]  = useState(null);

  // ── For pending retry: derive display values from the existing appointment ─
  const pendingDate = pendingAppt?.appointmentDate || '';
  const pendingTime = pendingAppt?.appointmentTime
    ? String(pendingAppt.appointmentTime).slice(0, 5)
    : '';
  const pendingDayName = dateToDayName(pendingDate);

  const today = new Date().toISOString().split('T')[0];

  // ── Business state — fetched from API if not passed via navigation state ───
  const initialBizFromState = location.state?.business || null;
  const [business, setBusiness] = useState(initialBizFromState);

  useEffect(() => {
    if (business) return; // already have it
    if (!businessId) return;
    getBusinessById(businessId)
      .then(r => setBusiness(r.data))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 404) {
          setError('This business is no longer available. It may have been removed.');
        }
      });
  }, [businessId, business]);

  // ── Load services if not passed in state ───────────────────────────────────
  useEffect(() => {
    if (isPendingRetry) return; // no need to load services in retry mode
    if (services.length === 0 && businessId) {
      setLoadingServices(true);
      getServicesByBusiness(businessId)
        .then(r => setServices(Array.isArray(r.data) ? r.data : []))
        .catch((err) => {
          const status = err?.response?.status;
          if (status === 404) {
            setError('This business or its services are no longer available.');
          }
        })
        .finally(() => setLoadingServices(false));
    }
  }, [businessId]);

  // ── If pending retry: immediately create the Razorpay order on mount ───────
  // This replaces the stale CREATED payment record and gives user a fresh order
  useEffect(() => {
    if (!isPendingRetry || !pendingAppt?.id) return;
    setLoading(true);
    createPaymentOrder(pendingAppt.id)
      .then(res => {
        setOrderData(res.data);
        setLoading(false);
      })
      .catch(e => {
        const msg = e.response?.data?.message || 'Could not prepare payment. Please try again.';
        setError(msg);
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Normal slot fetching ───────────────────────────────────────────────────
  useEffect(() => {
    if (isPendingRetry) return;
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

  // ── Derived values ─────────────────────────────────────────────────────────
  const currentService = isPendingRetry
    ? {
        id:       pendingAppt.serviceId,
        name:     pendingAppt.serviceName,
        price:    pendingAppt.price,
        duration: pendingAppt.duration,
      }
    : services.find(s => String(s.id) === String(selectedService));

  const servicePrice    = currentService?.price || 0;
  const depositAmount   = ((servicePrice * 30) / 100).toFixed(2);
  const remainingAmount = (servicePrice * 0.70).toFixed(2);

  const getSlotTime  = slot => {
    if (typeof slot === 'string') return slot;
    if (slot?.time) return typeof slot.time === 'string' ? slot.time.slice(0, 5) : slot.time;
    return '';
  };
  const isSlotBooked = slot => typeof slot === 'object' && slot?.booked === true;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleProceedToReview = () => {
    if (!selectedDate || !selectedSlot || !selectedService)
      return setError('Please select a service, date and time slot.');
    setError('');
    setStep('REVIEW');
  };

  const handleConfirmAndPay = async () => {
    setLoading(true); setError('');
    try {
      const apptRes = await bookAppointment({
        businessId:      parseInt(businessId),
        serviceId:       parseInt(selectedService),
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot + ':00',
      });
      const appointment = apptRes.data;
      setBookedAppt(appointment);

      const orderRes = await createPaymentOrder(appointment.id);
      const order    = orderRes.data;
      setOrderData(order);
      setStep('PAYING');
      openRazorpayCheckout(order, appointment);
    } catch (e) {
      setError(e.response?.data?.message || 'Booking failed. Please try again.');
      setStep('REVIEW');
    } finally {
      setLoading(false);
    }
  };

  // Used both by normal retry AND pending-appointment retry
  const handleOpenPayment = async () => {
    if (!orderData) {
      // Order not ready yet — fetch fresh one
      setLoading(true);
      try {
        const res = await createPaymentOrder(bookedAppt.id);
        setOrderData(res.data);
        setStep('PAYING');
        openRazorpayCheckout(res.data, bookedAppt);
      } catch (e) {
        setError(e.response?.data?.message || 'Could not initiate payment. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep('PAYING');
    openRazorpayCheckout(orderData, bookedAppt);
  };

  const openRazorpayCheckout = (order, appointment) => {
    if (!window.Razorpay) {
      setError('Payment system not loaded. Please refresh the page and try again.');
      setStep('REVIEW');
      return;
    }

    const options = {
      key:         order.keyId,
      amount:      Math.round(parseFloat(order.depositAmount) * 100),
      currency:    order.currency || 'INR',
      name:        'BookEase',
      description: `Deposit for ${order.serviceName}`,
      order_id:    order.orderId,
      prefill: {
        name:  order.customerName  || '',
        email: order.customerEmail || '',
      },
      theme: { color: '#6366f1' },
      handler: async (response) => {
        try {
          await verifyPayment({
            razorpayOrderId:   response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            appointmentId:     appointment.id,
          });
          setStep('DONE');
        } catch {
          setError(
            'Payment received but verification failed. Please contact support with appointment ID: ' + appointment.id
          );
          setStep('REVIEW');
        }
      },
      modal: {
        ondismiss: () => {
          setError('Payment not completed. Click "Pay Deposit" to try again.');
          setStep('REVIEW');
        },
        escape: true,
        animation: true,
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', () => {
      setError('Payment failed. Click "Pay Deposit" to try a different payment method.');
      setStep('REVIEW');
    });
    rzp.open();
  };

  // ── DONE screen ────────────────────────────────────────────────────────────
  if (step === 'DONE') {
    const doneDate = isPendingRetry ? pendingDate : selectedDate;
    const doneDay  = isPendingRetry ? pendingDayName : computedDay;
    const doneTime = isPendingRetry ? pendingTime : selectedSlot;
    return (
      <div className="page-container narrow">
        <div className="booking-biz-banner">
          <div className="booking-biz-banner-left">
            <div className="booking-biz-avatar">
              {business?.name?.[0]?.toUpperCase() || '🏢'}
            </div>
            <div>
              <div className="booking-biz-banner-name">{business?.name || 'BookEase'}</div>
            </div>
          </div>
        </div>
        <div className="card bk-done-card">
          <div className="bk-done-icon">🎉</div>
          <h2 className="bk-done-title">Booking Confirmed!</h2>
          <p className="bk-done-sub">
            Your deposit has been received. Your appointment is pending confirmation from the business owner.
            No action needed from your side — check your email for details.
          </p>
          <div className="booking-summary" style={{ marginTop: 24 }}>
            <div className="booking-summary-header">Booking Summary</div>
            <div className="booking-summary-row"><span>Service</span><span>{currentService?.name}</span></div>
            <div className="booking-summary-row"><span>Date</span><span>{formatDateNice(doneDate)} ({doneDay})</span></div>
            <div className="booking-summary-row"><span>Time</span><span>{doneTime}</span></div>
            <div className="booking-summary-row">
              <span>Deposit Paid</span><span className="booking-price">₹{depositAmount}</span>
            </div>
            <div className="booking-summary-row"><span>Pay at Service</span><span>₹{remainingAmount}</span></div>
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 24 }}
            onClick={() => navigate('/my-appointments')}>
            View My Appointments →
          </button>
        </div>
      </div>
    );
  }

  // ── PENDING RETRY: REVIEW step (skip SELECT, show pre-filled summary) ─────
  if (isPendingRetry && (step === 'REVIEW' || step === 'PAYING')) {
    return (
      <div className="page-container narrow">
        <div className="booking-biz-banner">
          <div className="booking-biz-banner-left">
            <div className="booking-biz-avatar">
              {business?.name?.[0]?.toUpperCase() || '🏢'}
            </div>
            <div>
              <div className="booking-biz-banner-name">{business?.name || pendingAppt.businessName}</div>
            </div>
          </div>
          <div className="booking-biz-banner-right">
            <div className="booking-biz-banner-label">Complete Payment</div>
          </div>
        </div>

        <StepIndicator step="REVIEW" />

        <div className="card">
          {/* Info banner — explains why they're here */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 10,
            marginBottom: 20,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
            <div style={{ fontSize: 13, color: '#c7d2fe', lineHeight: 1.5 }}>
              You previously reserved this slot but the deposit payment was not completed.
              Your slot is still held. Pay the deposit below to confirm your booking.
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          {step === 'PAYING' && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
              color: '#86efac',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>⏳</span>
              Razorpay checkout is open — complete payment to confirm your booking.
            </div>
          )}

          <h3 className="bk-review-title">Your Booking Details</h3>

          <div className="booking-summary">
            <div className="booking-summary-header">Appointment Summary</div>
            <div className="booking-summary-row">
              <span>Business</span>
              <span>{pendingAppt.businessName}</span>
            </div>
            <div className="booking-summary-row">
              <span>Service</span>
              <span>{pendingAppt.serviceName}</span>
            </div>
            {(pendingAppt.serviceAddress || pendingAppt.serviceCity) && (
              <div className="booking-summary-row">
                <span>Location</span>
                <span>
                  {[pendingAppt.serviceAddress, pendingAppt.serviceCity, pendingAppt.serviceState]
                    .filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            <div className="booking-summary-row">
              <span>Date</span>
              <span>{formatDateNice(pendingDate)} ({pendingDayName})</span>
            </div>
            <div className="booking-summary-row">
              <span>Time</span>
              <span>{pendingTime}</span>
            </div>
            {pendingAppt.duration && (
              <div className="booking-summary-row">
                <span>Duration</span>
                <span>{pendingAppt.duration} min</span>
              </div>
            )}
            <div className="booking-summary-row">
              <span>Total Service Price</span>
              <span>₹{servicePrice}</span>
            </div>
            <div className="booking-summary-row bk-summary-deposit">
              <span>💳 Deposit to Pay Now (30%)</span>
              <span className="booking-price">₹{depositAmount}</span>
            </div>
            <div className="booking-summary-row">
              <span>Pay at Service (70%)</span>
              <span>₹{remainingAmount}</span>
            </div>
          </div>

          <div className="bk-policy-box">
            <div className="bk-policy-title">📋 Cancellation & Refund Policy</div>
            <div className="bk-policy-row bk-policy-row--green">
              <span>✅</span><span>Cancel <strong>48+ hours</strong> before → Full refund</span>
            </div>
            <div className="bk-policy-row bk-policy-row--yellow">
              <span>⚠️</span><span>Cancel <strong>24–48 hours</strong> before → 50% refund</span>
            </div>
            <div className="bk-policy-row bk-policy-row--red">
              <span>❌</span><span>Cancel <strong>within 24 hours</strong> → No refund</span>
            </div>
          </div>

          <div className="bk-review-actions">
            <button className="btn btn-secondary"
              onClick={() => navigate('/my-appointments')}>
              ← Back to Appointments
            </button>
            <button className="btn btn-primary bk-pay-btn"
              onClick={handleOpenPayment}
              disabled={loading}>
              {loading
                ? '⏳ Preparing payment...'
                : `💳 Pay ₹${depositAmount} Deposit`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal SELECT → REVIEW → PAYING flow ──────────────────────────────────
  return (
    <div className="page-container narrow">
      <div className="booking-biz-banner">
        <div className="booking-biz-banner-left">
          <div className="booking-biz-avatar">
            {business?.name?.[0]?.toUpperCase() || '🏢'}
          </div>
          <div>
            <div className="booking-biz-banner-name">
              {business?.name || 'Book Appointment'}
            </div>
            {business?.city && (
              <div className="booking-biz-banner-location">
                📍 {[business?.city, business?.state].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>
        <div className="booking-biz-banner-right">
          <div className="booking-biz-banner-label">Appointment Booking</div>
        </div>
      </div>

      <StepIndicator step={step} />

      {/* SELECT step */}
      {step === 'SELECT' && (
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Select Service {loadingServices && '(loading...)'}</label>
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
              </div>
            )}
          </div>

          {selectedService && (
            <div className="form-group">
              <label className="form-label">Select Date</label>
              <input className="form-input" type="date" min={today}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ colorScheme: 'dark' }} />
              {selectedDate && computedDay && (
                <div className="booking-day-label">📆 {computedDay} · {selectedDate}</div>
              )}
            </div>
          )}

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

      {/* REVIEW step (normal flow) */}
      {step === 'REVIEW' && currentService && !isPendingRetry && (
        <div className="card">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <div>{error}</div>
              {bookedAppt && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }}
                  onClick={handleOpenPayment} disabled={loading}>
                  {loading ? '⏳ Loading...' : '🔄 Retry Payment'}
                </button>
              )}
            </div>
          )}

          <h3 className="bk-review-title">Confirm Your Booking</h3>

          <div className="booking-summary">
            <div className="booking-summary-header">Booking Details</div>
            <div className="booking-summary-row"><span>Business</span><span>{business?.name || '—'}</span></div>
            <div className="booking-summary-row"><span>Service</span><span>{currentService.name}</span></div>
            <div className="booking-summary-row"><span>Location</span><span>{formatServiceLocation(currentService)}</span></div>
            <div className="booking-summary-row"><span>Date</span><span>{selectedDate} ({computedDay})</span></div>
            <div className="booking-summary-row"><span>Time</span><span>{selectedSlot}</span></div>
            {(currentService.duration || currentService.durationMinutes) && (
              <div className="booking-summary-row">
                <span>Duration</span>
                <span>{currentService.duration || currentService.durationMinutes} min</span>
              </div>
            )}
            <div className="booking-summary-row"><span>Total Price</span><span>₹{currentService.price}</span></div>
            <div className="booking-summary-row bk-summary-deposit">
              <span>💳 Deposit Now (30%)</span>
              <span className="booking-price">₹{depositAmount}</span>
            </div>
            <div className="booking-summary-row"><span>Pay at Service (70%)</span><span>₹{remainingAmount}</span></div>
          </div>

          <div className="bk-policy-box">
            <div className="bk-policy-title">📋 Cancellation & Refund Policy</div>
            <div className="bk-policy-row bk-policy-row--green">
              <span>✅</span><span>Cancel <strong>48+ hours</strong> before → Full refund</span>
            </div>
            <div className="bk-policy-row bk-policy-row--yellow">
              <span>⚠️</span><span>Cancel <strong>24–48 hours</strong> before → 50% refund</span>
            </div>
            <div className="bk-policy-row bk-policy-row--red">
              <span>❌</span><span>Cancel <strong>within 24 hours</strong> → No refund</span>
            </div>
            <div className="bk-policy-row">
              <span>🔄</span>
              <span>Reschedule allowed up to 24 hrs before (max 2 times, no extra charge)</span>
            </div>
          </div>

          <div className="bk-review-actions">
            {!bookedAppt && (
              <button className="btn btn-secondary"
                onClick={() => { setStep('SELECT'); setError(''); }}
                disabled={loading}>
                ← Back
              </button>
            )}
            {bookedAppt ? (
              <button className="btn btn-primary bk-pay-btn"
                onClick={handleOpenPayment} disabled={loading}>
                {loading ? '⏳ Loading...' : `🔄 Retry Payment — ₹${depositAmount}`}
              </button>
            ) : (
              <button className="btn btn-primary bk-pay-btn"
                onClick={handleConfirmAndPay} disabled={loading}>
                {loading ? '⏳ Processing…' : `💳 Pay ₹${depositAmount} Deposit`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* PAYING step */}
      {step === 'PAYING' && !isPendingRetry && (
        <div className="card bk-paying-card">
          <div className="bk-paying-spinner">⏳</div>
          <h3 className="bk-paying-title">Complete Payment</h3>
          <p className="bk-paying-sub">
            Razorpay checkout is open. Complete your payment there to confirm your booking.
          </p>
          <p className="bk-paying-note">Do not close this tab.</p>
        </div>
      )}
    </div>
  );
}