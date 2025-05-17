import { Navigate } from 'react-router-dom';
import { AUTH_ROUTES } from '../constants/auth';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />;
  }

  return children;
};

export default ProtectedRoute; 