import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  forgotPassword,
  verifyOtp,
  resetPassword
} from '../api/auth';

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

        // Redirect after 3 seconds
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

    try {

      setLoading(true);

      await resetPassword(email, newPassword);

      alert('Password reset successful');

      navigate('/');

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
        style={{
          maxWidth: '460px',
          width: '100%'
        }}
      >

        <div className="auth-logo">
          <div className="logo-icon">🔐</div>

          <h1>Reset Password</h1>

          <p>
            Securely recover your account
          </p>
        </div>

        {message && (
          <div className="alert alert-success">
            {message}
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {redirecting && (
            <div
                style={{
                marginTop: '16px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(79, 70, 229, 0.14)',
                border: '1px solid rgba(129, 140, 248, 0.28)',
                color: '#c7d2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: '14px',
                fontWeight: '500',
                letterSpacing: '0.2px',
                marginBottom: '10px'
                }}
            >
            <span
                style={{
                    fontSize: '16px'
                }}
                >
                ↩
            </span>

                Redirecting to login page...
            </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (

          <form onSubmit={handleSendOtp}>

            <div className="form-group">

              <label className="form-label">
                Email Address
              </label>

              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Sending OTP...'
                : 'Send OTP'}
            </button>

          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (

          <form onSubmit={handleVerifyOtp}>

            <div className="form-group">

              <label className="form-label">
                Enter OTP
              </label>

              <input
                className="form-input"
                type="text"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value)
                }
                required
              />

            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Verifying...'
                : 'Verify OTP'}
            </button>

          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (

          <form onSubmit={handleResetPassword}>

            <div className="form-group">

              <label className="form-label">
                New Password
              </label>

              <input
                className="form-input"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                required
              />

              <div
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#d1d5db',
                  fontSize: '14px'
                }}
              >
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() =>
                    setShowPassword(!showPassword)
                  }
                  style={{
                    width: '17px',
                    height: '17px',
                    accentColor: '#6d5efc',
                    cursor: 'pointer'
                  }}
                />

                <label
                  style={{
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  Show Password
                </label>
              </div>

            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Updating...'
                : 'Reset Password'}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}