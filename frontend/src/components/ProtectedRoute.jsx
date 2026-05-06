import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth'; 

export default function ProtectedRoute({ children, roles }) {
  const { user, role } = useAuth();

  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/dashboard" replace />;

  return children;
}