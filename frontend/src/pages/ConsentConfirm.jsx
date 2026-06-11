import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getConsentDetails, confirmByLink, disputeByLink } from '../api/payments';

export default function ConsentConfirm() {
    const { token } = useParams();

    const [details,   setDetails]   = useState(null);
    const [step,      setStep]      = useState('LOADING'); // LOADING | CONFIRM | DISPUTE | DONE | ERROR
    const [reason,    setReason]    = useState('');
    const [loading,   setLoading]   = useState(false);
    const [errorMsg,  setErrorMsg]  = useState('');
    const [doneMsg,   setDoneMsg]   = useState('');

    useEffect(() => {
        getConsentDetails(token)
            .then(r => { setDetails(r.data); setStep('CONFIRM'); })
            .catch(e => {
                setErrorMsg(e.response?.data?.message || 'Invalid or expired link');
                setStep('ERROR');
            });
    }, [token]);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await confirmByLink(token);
            setDoneMsg('Thank you! Service confirmed. You can now leave a review from your appointments.');
            setStep('DONE');
        } catch (e) {
            setErrorMsg(e.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleDispute = async () => {
        setLoading(true);
        try {
            await disputeByLink(token, reason);
            setDoneMsg('Your dispute has been recorded. Our team will contact you within 24 hours.');
            setStep('DONE');
        } catch (e) {
            setErrorMsg(e.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <div style={s.card}>
                <div style={s.logo}>📅 BookEase</div>

                {step === 'LOADING' && (
                    <p style={s.muted}>Verifying your link…</p>
                )}

                {step === 'ERROR' && (
                    <>
                        <div style={s.iconBig}>❌</div>
                        <h2 style={s.title}>Link Invalid</h2>
                        <p style={s.muted}>{errorMsg}</p>
                    </>
                )}

                {step === 'DONE' && (
                    <>
                        <div style={s.iconBig}>✅</div>
                        <h2 style={s.title}>Done!</h2>
                        <p style={s.muted}>{doneMsg}</p>
                    </>
                )}

                {step === 'CONFIRM' && details && (
                    <>
                        <h2 style={s.title}>Confirm Service Completion</h2>
                        <p style={s.muted}>Please confirm that you received the following service:</p>

                        <div style={s.summaryBox}>
                            <Row label="Business"  value={details.businessName} />
                            <Row label="Service"   value={details.serviceName} />
                            <Row label="Date"      value={details.appointmentDate} />
                            <Row label="Time"      value={details.appointmentTime?.slice(0, 5)} />
                            <Row label="Customer"  value={details.customerName} />
                        </div>

                        {errorMsg && <div style={s.error}>{errorMsg}</div>}

                        <p style={{ textAlign: 'center', color: '#94a3b8',
                                    fontSize: 14, marginBottom: 16 }}>
                            Did you receive this service?
                        </p>

                        <button style={s.confirmBtn} onClick={handleConfirm} disabled={loading}>
                            {loading ? '⏳ Confirming…' : '✅ Yes, I Received the Service'}
                        </button>

                        <button style={s.disputeBtn}
                            onClick={() => setStep('DISPUTE')} disabled={loading}>
                            ❌ No, I Have a Dispute
                        </button>
                    </>
                )}

                {step === 'DISPUTE' && (
                    <>
                        <div style={s.iconBig}>⚠️</div>
                        <h2 style={s.title}>Raise a Dispute</h2>
                        <p style={s.muted}>
                            Please briefly describe your concern and our team will review it within 24 hours.
                        </p>

                        <textarea
                            style={s.textarea}
                            rows={4}
                            placeholder="Describe what happened…"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />

                        {errorMsg && <div style={s.error}>{errorMsg}</div>}

                        <button style={s.confirmBtn} onClick={handleDispute}
                            disabled={loading || !reason.trim()}>
                            {loading ? '⏳ Submitting…' : 'Submit Dispute'}
                        </button>

                        <button style={s.disputeBtn}
                            onClick={() => setStep('CONFIRM')} disabled={loading}>
                            ← Go Back
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '8px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
            <strong style={{ fontSize: 13, color: '#e2e8f0' }}>{value}</strong>
        </div>
    );
}

const s = {
    page: {
        minHeight: '100vh', background: '#0d0f19',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 20px',
    },
    card: {
        background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '36px 40px',
        width: '100%', maxWidth: 480, textAlign: 'center',
    },
    logo: { fontSize: 20, fontWeight: 800, color: '#a5b4fc', marginBottom: 24 },
    iconBig: { fontSize: '3rem', marginBottom: 16 },
    title: { fontSize: '1.3rem', fontWeight: 800, color: '#e2e8f0', marginBottom: 10 },
    muted: { color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 20 },
    summaryBox: {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '4px 20px',
        marginBottom: 20, textAlign: 'left',
    },
    confirmBtn: {
        width: '100%', padding: '13px', marginBottom: 10,
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: '#fff', border: 'none', borderRadius: 8,
        fontSize: 15, fontWeight: 700, cursor: 'pointer',
    },
    disputeBtn: {
        width: '100%', padding: '13px',
        background: 'transparent',
        border: '1px solid rgba(239,68,68,0.3)',
        color: '#f87171', borderRadius: 8,
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
    },
    textarea: {
        width: '100%', boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '12px 14px',
        color: '#e2e8f0', fontSize: 14,
        resize: 'vertical', outline: 'none', marginBottom: 14,
    },
    error: {
        padding: '10px 14px', marginBottom: 14,
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 8, color: '#f87171', fontSize: 13,
    },
};