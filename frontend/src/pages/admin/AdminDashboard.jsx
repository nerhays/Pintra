import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Admin Dashboard</h2>

      <button onClick={() => navigate("/admin/room")}>Approval Ruang</button>

      <br />
      <br />

      <button onClick={logout}>Logout</button>
    </div>
  );
}

export default AdminDashboard;
