import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export const RequireRole = ({ children, role }) => {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};