import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminRoute({ children }) {
  const { user, role, loading } = useAuth();

  console.log("ADMIN ROUTE CHECK");
  console.log("USER:", user);
  console.log("ROLE:", role);
  console.log("LOADING:", loading);

  if (loading) return null;

  if (!user || (role !== "admin" && role !== "operator")) {
    console.log("❌ BUKAN ADMIN → REDIRECT KE /home");
    return <Navigate to="/home" replace />;
  }

  console.log("✅ ADMIN VALID → MASUK DASHBOARD");

  return children;
}

export default AdminRoute;
