import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AuthRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // atau loading spinner

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AuthRoute;
