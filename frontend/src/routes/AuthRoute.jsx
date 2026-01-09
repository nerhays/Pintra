import { Navigate } from "react-router-dom";
import { auth } from "../firebase";

function AuthRoute({ children }) {
  const user = auth.currentUser;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AuthRoute;
