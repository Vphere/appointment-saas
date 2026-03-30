import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

/**
 * OAuth2 Callback Page
 *
 * After Google OAuth2 succeeds, the Spring Boot backend should redirect to:
 *   http://localhost:5173/oauth2/callback?token=<JWT>
 *
 * This page captures the token, stores it, and redirects to the dashboard.
 */
export default function OAuth2Callback() {
  const [searchParams] = useSearchParams();
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    console.log('[OAuth2Callback] token param:', token ? 'present' : 'missing');

    if (token) {
      loginUser(token);
      navigate('/dashboard', { replace: true });
    } else {
      // No token — redirect back to login with error
      navigate('/?error=oauth_failed', { replace: true });
    }
  }, [searchParams, loginUser, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    }}>
      <Spinner message="Completing Google sign-in..." />
    </div>
  );
}
