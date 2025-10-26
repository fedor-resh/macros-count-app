import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (!session && !loading) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
