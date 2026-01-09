import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function AdminRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));

      const snapshot = await getDocs(q);

      if (!snapshot.empty && snapshot.docs[0].data().role === "admin") {
        setIsAdmin(true);
      }

      setLoading(false);
    };

    checkRole();
  }, []);

  if (loading) return null; // bisa diganti loading spinner

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default AdminRoute;
