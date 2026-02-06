import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export const RequireAuth = ({ children }) => {
  const { user, accessToken } = useAuth();

  if (!user || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
};