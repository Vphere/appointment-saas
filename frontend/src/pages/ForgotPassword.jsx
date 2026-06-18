import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  forgotPassword,
  verifyOtp,
  resetPassword
} from '../api/auth';
import BookEaseLogo from '../components/BookEaseLogo';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function PasswordRequirements({ password }) {
  const checks = [
    { label: 'At least 8 characters',                   ok: password.length >= 8 },
    { label: 'One uppercase letter (A–Z)',               ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a–z)',               ok: /[a-z]/.test(password) },
    { label: 'One digit (0–9)',                          ok: /\d/.test(password) },
    { label: 'One special character (!@#$%^&*…)',        ok: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div style={{
      marginTop: 10,
      padding: '12px 14px',
      background: 'rgba(99,102,241,0.08)',
      borderRadius: 8,
      border: '1px solid rgba(99,102,241,0.2)',
    }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Password requirements
      </p>
      {checks.map(({ label, ok }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: ok ? '#4ade80' : '#6b7280' }}>{ok ? '✓' : '○'}</span>
          <span style={{ fontSize: 13, color: ok ? '#d1fae5' : '#9ca3af' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ForgotPassword() {

  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [redirecting, setRedirecting] = useState(false);

  // STEP 1 -> SEND OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      setLoading(true);
      await forgotPassword(email);
      setMessage('OTP sent successfully to your email');
      setStep(2);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        'Failed to send OTP';

      setError(msg);
      setRedirecting(true);

      setTimeout(() => {
        navigate('/');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 -> VERIFY OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      setLoading(true);
      await verifyOtp(email, otp);
      setMessage('OTP verified successfully');
      setStep(3);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        'Invalid OTP';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 -> RESET PASSWORD
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Front-end password policy check
    if (!PASSWORD_REGEX.test(newPassword)) {
      setError(
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit, and a special character.'
      );
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email, newPassword);
      setMessage('Password reset successful! Redirecting to login...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        'Password reset failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div
        className="auth-card"
        style={{ maxWidth: '460px', width: '100%' }}
      >

        <div className="auth-logo">
          <BookEaseLogo height={55} style={{marginBottom: 8 }} />
          <h1>Reset Password</h1>
          <p>Securely recover your account</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error   && <div className="alert alert-error">{error}</div>}

        {redirecting && (
          <div style={{
            marginTop: '16px',
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(79, 70, 229, 0.14)',
            border: '1px solid rgba(129, 140, 248, 0.28)',
            color: '#c7d2fe',
            display: 'flex',
            alignItems: 'center',gap: '10px',
            fontSize: '14px',
            fontWeight: '500',
            letterSpacing: '0.2px',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '16px' }}>↩</span>
            Redirecting to login page...
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label className="form-label">Enter OTP</label>
              <input
                className="form-input"
                type="text"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">New Password</label>

              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <div style={{
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#d1d5db',
                fontSize: '14px'
              }}>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  style={{ width: '17px', height: '17px', accentColor: '#6d5efc', cursor: 'pointer' }}
                />
                <label
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  Show Password
                </label>
              </div>

              {/* Show requirements inline while user types */}
              <PasswordRequirements password={newPassword} />
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}