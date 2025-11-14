import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../DataStores";

export const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={location} />;

  return children;
};
