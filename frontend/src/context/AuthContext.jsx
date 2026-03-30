import { createContext, useContext, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

/**
 * Spring Boot JWT tokens typically encode the role in one of:
 *   - decoded.role  (e.g. "CUSTOMER")
 *   - decoded.roles (array, e.g. ["CUSTOMER"])
 *   - decoded.authorities (array, e.g. ["ROLE_CUSTOMER"])
 *   - decoded.scope
 */
function extractRole(decoded) {
  // Direct role field
  if (decoded.role) return decoded.role.replace('ROLE_', '');

  // Array of roles
  if (Array.isArray(decoded.roles) && decoded.roles.length) {
    return decoded.roles[0].replace('ROLE_', '');
  }

  // Spring Security "authorities" claim (list of { authority: "ROLE_X" } or plain strings)
  if (Array.isArray(decoded.authorities) && decoded.authorities.length) {
    const first = decoded.authorities[0];
    const raw = typeof first === 'string' ? first : first?.authority || '';
    return raw.replace('ROLE_', '');
  }

  // scope (e.g. "CUSTOMER")
  if (decoded.scope) return decoded.scope.replace('ROLE_', '');

  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      const role = extractRole(decoded);
      const name =
        decoded.name ||                     // from JWT (best case)
        decoded.fullName ||                // optional future
        decoded.sub?.split('@')[0];        // fallback

      return {
        ...decoded,
        role,
        name,      // ✅ ensure name always exists
        email: decoded.sub,
        token
      };
    } catch {
      return null;
    }
  });

  const loginUser = useCallback((token) => {
    localStorage.setItem('token', token);
    const decoded = jwtDecode(token);
    const role = extractRole(decoded);

    const name =
      decoded.name ||
      decoded.fullName ||
      decoded.sub?.split('@')[0];

    setUser({
      ...decoded,
      role,
      name,
      email: decoded.sub,
      token
    });
  }, []);

  const logoutUser = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
