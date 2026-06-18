import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import BookEaseLogo from '../components/BookEaseLogo';

const ROLES = [
  { value: 'CUSTOMER', label: '👤 Customer — Book appointments' },
  { value: 'BUSINESS_OWNER', label: '🏢 Business Owner — Manage my business' },
];

// Password policy: at least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function getPasswordErrors(password) {
  const errors = [];
  if (!password || password.length < 8)        errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password))                 errors.push('At least one uppercase letter (A–Z)');
  if (!/[a-z]/.test(password))                 errors.push('At least one lowercase letter (a–z)');
  if (!/\d/.test(password))                    errors.push('At least one digit (0–9)');
  if (!/[^A-Za-z0-9]/.test(password))          errors.push('At least one special character (!@#$…)');
  return errors;
}

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

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Front-end password policy check before sending to server
    const pwdErrors = getPasswordErrors(form.password);
    if (pwdErrors.length > 0) {
      setPasswordTouched(true);
      setError('Password does not meet the requirements listed below.');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/oauth2/authorization/google`;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <BookEaseLogo height={55} style={{marginBottom: 8 }} />
          <h1>Create account</h1>
          <p>Join BookEase today — to book hassle free appointments</p>
        </div>

        {success ? (
          <div className="alert alert-success" style={{ textAlign: 'center' }}>
            🎉 Account created! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                name="name"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>

              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => {
                    handleChange(e);
                    setPasswordTouched(true);
                  }}
                  required
                  style={{ paddingRight: '70px' }}
                />

                <div
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '15px',
                    color: '#f6f2f2'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4f46e5' }}
                  />
                  <label
                    style={{ cursor: 'pointer', userSelect: 'none', fontWeight: '500' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    Show Password
                  </label>
                </div>

                {/* Always show requirements below the password field on register */}
                <PasswordRequirements password={form.password} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">I am a...</label>
              <select
                className="form-select"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>

            {/* Divider */}
            <div className="auth-divider" style={{ margin: '20px 0' }}>or</div>

            <button
              className="btn btn-full"
              type="button"
              onClick={handleGoogleLogin}
              style={{
                background: '#fff',
                color: '#3c4043',
                border: '1px solid #dadce0',
                display: 'flex',
                alignItems: 'center',gap: 10,
                fontWeight: 500,
                padding: '11px 20px',
                borderRadius: 8,
                marginTop: 6,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.1L38.5 8C34.7 4.6 29.7 2.5 24 2.5 14.7 2.5 6.9 7.9 3.3 15.6l5.6 4.3C10.7 13.6 16.9 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.7-2.1 5-4.5 6.5l7 5.4c4.1-3.8 6.5-9.4 6.5-16.4-.1 0-.3 0-.3.1z"/>
                <path fill="#FBBC05" d="M8.9 28.6C8.5 27.5 8.3 26.3 8.3 25s.2-2.5.6-3.6L3.3 17.1C1.8 20 1 23.4 1 27c0 3.4.8 6.6 2.3 9.4l5.6-4.3-.1-3.5z"/>
                <path fill="#34A853" d="M24 47.5c5.7 0 10.5-1.9 14-5.1l-7-5.4c-1.9 1.3-4.3 2-7 2-7.1 0-13.2-4.1-15.1-9.8L2.3 34.2C5.9 41.9 14.3 47.5 24 47.5z"/>
              </svg>
              Continue with Google
            </button>
          </form>
        )}

        <div className="auth-link">
          Already have an account? <Link to="/">Sign in</Link>
        </div>
      </div>
    </div>
  );
}