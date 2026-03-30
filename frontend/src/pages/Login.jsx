import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const GOOGLE_OAUTH_URL = 'http://localhost:8080/oauth2/authorization/google';

export default function Login() {
  const { loginUser, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.token || res.data.jwt || res.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = GOOGLE_OAUTH_URL;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">📆</div>
          <h1>Welcome back</h1>
          <p>Sign in to your BookEase account</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

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
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            type="submit"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider" style={{ margin: '20px 0' }}>or</div>

        {/* Google Login */}
        <button
          className="btn btn-full"
          type="button"
          onClick={handleGoogleLogin}
          style={{
            background: '#fff',
            color: '#3c4043',
            border: '1px solid #dadce0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontWeight: 500,
            padding: '11px 20px',
            borderRadius: 8,
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

        <div className="auth-link" style={{ marginTop: 16 }}>
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}