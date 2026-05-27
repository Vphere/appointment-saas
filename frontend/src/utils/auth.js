import { getInMemoryToken } from '../context/tokenStore';
import { jwtDecode } from 'jwt-decode';

export function getToken() {
  return getInMemoryToken();
}

export function getUserRole() {
  const token = getToken();
  if (!token) return null;
  const decoded = jwtDecode(token);
  return decoded.role;
}

export function isAuthenticated() {
  return !!getToken();
}

// logout is now handled via logoutUser() from useAuth() — don't call this directly
