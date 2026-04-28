import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PublicRoute = ({ children }) => {
  const { user } = useAuth();

  // If already logged in → redirect
  if (user) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'}
        replace
      />
    );
  }

  return children;
};

export default PublicRoute;