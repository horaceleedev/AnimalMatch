import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../DataStores";

interface ProtectedRouteProps {
  children: JSX.Element;
  editorOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, editorOnly = false }) => {
  const { user, isEditor } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={location} />;
  if (editorOnly && !isEditor) return <Navigate to="/videos" replace />;

  return children;
};
