import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../api/axiosInstance';
import BookEaseLogo from '../components/BookEaseLogo';

export default function CompleteProfile() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const email = params.get('email');
  const name  = params.get('name');
  const [role, setRole] = useState('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/complete-profile', { email, role });
      loginUser(res.data.token);
      navigate('/dashboard');
    } catch (e) {
      setError(e.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <BookEaseLogo height={45} />
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{
            color: '#ffffff',
            fontSize: '1.75rem',
            fontWeight: 700,
            margin: '0 0 8px 0',
          }}>
            One last step!
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.95rem',
            margin: 0,
          }}>
            Welcome, <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{name}</span>! How will you use BookEase?
          </p>
        </div>

        {/* Role Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          {/* Customer Card */}
          <div
            onClick={() => setRole('CUSTOMER')}
            style={{
              padding: '18px 20px',
              borderRadius: '14px',
              border: role === 'CUSTOMER'
                ? '2px solid #6c63ff'
                : '2px solid rgba(255,255,255,0.08)',
              background: role === 'CUSTOMER'
                ? 'rgba(108,99,255,0.15)'
                : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{
              width: 44, height: 44,
              borderRadius: '12px',
              background: role === 'CUSTOMER' ? 'rgba(108,99,255,0.3)' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center',fontSize: '20px', flexShrink: 0,
            }}>
              👤
            </div>
            <div>
              <div style={{
                color: '#ffffff', fontWeight: 600,
                fontSize: '0.95rem', marginBottom: '3px',
              }}>
                Customer
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
                Browse and book appointments
              </div>
            </div>
            {role === 'CUSTOMER' && (
              <div style={{
                marginLeft: 'auto', width: 20, height: 20,
                borderRadius: '50%',
                background: '#6c63ff',
                display: 'flex', alignItems: 'center',fontSize: '11px', color: '#fff', flexShrink: 0,
              }}>✓</div>
            )}
          </div>

          {/* Business Owner Card */}
          <div
            onClick={() => setRole('BUSINESS_OWNER')}
            style={{
              padding: '18px 20px',
              borderRadius: '14px',
              border: role === 'BUSINESS_OWNER'
                ? '2px solid #6c63ff'
                : '2px solid rgba(255,255,255,0.08)',
              background: role === 'BUSINESS_OWNER'
                ? 'rgba(108,99,255,0.15)'
                : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{
              width: 44, height: 44,
              borderRadius: '12px',
              background: role === 'BUSINESS_OWNER' ? 'rgba(108,99,255,0.3)' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center',fontSize: '20px', flexShrink: 0,
            }}>
              🏢
            </div>
            <div>
              <div style={{
                color: '#ffffff', fontWeight: 600,
                fontSize: '0.95rem', marginBottom: '3px',
              }}>
                Business Owner
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
                List and manage your business
              </div>
            </div>
            {role === 'BUSINESS_OWNER' && (
              <div style={{
                marginLeft: 'auto', width: 20, height: 20,
                borderRadius: '50%',
                background: '#6c63ff',
                display: 'flex', alignItems: 'center',fontSize: '11px', color: '#fff', flexShrink: 0,
              }}>✓</div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: loading
              ? 'rgba(108,99,255,0.5)'
              : 'linear-gradient(135deg, #6c63ff, #8b83ff)',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(108,99,255,0.4)',
          }}
        >
          {loading ? 'Setting up your account...' : 'Continue →'}
        </button>

        {/* Email note */}
        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.25)',
          fontSize: '0.75rem',
          marginTop: '20px',
          marginBottom: 0,
        }}>
          Signing in as {email}
        </p>
      </div>
    </div>
  );
}