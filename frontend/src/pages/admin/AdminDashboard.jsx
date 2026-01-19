import AdminLayout from "../../components/admin/AdminLayout";
import "./AdminDashboard.css";

function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="welcome-card">
        <div className="welcome-text">
          <h2>Hai, Selamat Datang</h2>
          <p>Selamat Melanjutkan Aktivitas</p>
        </div>

        <div className="welcome-illustration">
          <div className="img-box" />
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
