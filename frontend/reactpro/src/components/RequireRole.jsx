import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export const RequireRole = ({ children, role, roles }) => {
  const { user } = useAuth();

  // Allow passing either a single role or an array of roles
  const allowedRoles = roles || (role ? [role] : []);
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};