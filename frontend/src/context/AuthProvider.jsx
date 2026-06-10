// AuthProvider.jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from './AuthContext';
import api from '../api/axiosInstance';
import { setInMemoryToken, clearInMemoryToken, setTokenExpiry } from './tokenStore';
import Spinner from '../components/Spinner';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const didAttemptRefresh = useRef(false); // ← ADD THIS

  const buildUser = (token) => {
    const decoded = jwtDecode(token);
    const role = decoded.role?.replace('ROLE_', '');
    const name = decoded.name || decoded.fullName || decoded.sub?.split('@')[0];
    return { ...decoded, role, name, email: decoded.sub, token };
  };

useEffect(() => {
    if (didAttemptRefresh.current) return;
    didAttemptRefresh.current = true;

    api.post('/api/auth/refresh')
        .then(res => {
            const token = res.data.accessToken;
            setInMemoryToken(token);
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              setTokenExpiry(payload.exp * 1000);   // ← ADD THIS
            } catch {
              setTokenExpiry(Date.now() + 900_000);
            }
            setUser(buildUser(token));
        })
        .catch((err) => {
            
            if (err.response?.status !== 401) {
                console.error('Unexpected error during silent refresh:', err);
            }
            setUser(null);
        })
        .finally(() => {
            setLoading(false);
        });
  }, []);

  const loginUser = useCallback((token) => {
    setInMemoryToken(token);
    try {
      const decoded = jwtDecode(token);
      setTokenExpiry(decoded.exp * 1000);   // jwtDecode gives exp in seconds
    } catch {
      setTokenExpiry(Date.now() + 900_000);
    }
    setUser(buildUser(token));
  }, []);

  const logoutUser = useCallback(async () => {
    setIsLoggingOut(true);          // ← freeze render
    try { await api.post('/api/auth/logout'); } catch (_) {}
    clearInMemoryToken();
    setUser(null);
    setIsLoggingOut(false);         // ← unfreeze after user is cleared
  }, []);
  if (loading || isLoggingOut) return <Spinner message="Please wait..." />;

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}