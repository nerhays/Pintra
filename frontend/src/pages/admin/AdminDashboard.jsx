import AdminLayout from "../../components/admin/AdminLayout";
import welcomeImg from "../../assets/WelcomePage.png";
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
          <img src={welcomeImg} alt="Welcome" />
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
