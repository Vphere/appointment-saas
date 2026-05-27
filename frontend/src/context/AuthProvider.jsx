// AuthProvider.jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from './AuthContext';
import api from '../api/axiosInstance';
import { setInMemoryToken, clearInMemoryToken } from './tokenStore';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
    setUser(buildUser(token));
  }, []);

  const logoutUser = useCallback(async () => {
    try { await api.post('/api/auth/logout'); } catch (_) {}
    clearInMemoryToken();
    setUser(null);
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}