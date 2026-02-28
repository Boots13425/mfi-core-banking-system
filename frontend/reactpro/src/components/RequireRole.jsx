import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export const RequireRole = ({ children, role, roles }) => {
  const { user } = useAuth();

  // Allow passing either a single role or an array of roles
  const allowedRoles = roles || (role ? [role] : []);
  
  // if there's no logged-in user, redirect to login instead of unauthorized
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};