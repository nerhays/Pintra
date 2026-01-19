import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AdminLayout.css";

function AdminSidebar({ sidebarOpen, mobileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [masterOpen, setMasterOpen] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [monitoringOpen, setMonitoringOpen] = useState(false);

  // ✅ helper untuk active class
  const isActive = (path) => location.pathname === path;

  return (
    <div
      className={`admin-sidebar 
        ${sidebarOpen ? "open" : "collapsed"} 
        ${mobileOpen ? "open" : ""}`}
    >
      {/* LOGO */}
      <div className="sidebar-logo" onClick={() => navigate("/admin")} style={{ cursor: "pointer" }}>
        <h3>{sidebarOpen ? "ADMIN" : "A"}</h3>
      </div>

      <div className="sidebar-menu">
        {/* ✅ DASHBOARD (CLICKABLE) */}
        <div className={`menu-item ${isActive("/admin") ? "active" : ""}`} onClick={() => navigate("/admin")} style={{ cursor: "pointer" }}>
          <span className="menu-icon">🏠</span>
          {sidebarOpen && <span>Dashboard</span>}
        </div>

        {/* MASTER DATA */}
        <div className="menu-item" onClick={() => setMasterOpen(!masterOpen)}>
          <span className="menu-icon">📂</span>
          {sidebarOpen && <span>Master Data</span>}
          {sidebarOpen && <span className={`arrow ${masterOpen ? "rotate" : ""}`}>▾</span>}
        </div>

        <div className={`submenu ${masterOpen ? "show" : ""}`}>
          <div className="submenu-item" onClick={() => navigate("/admin/master/user")}>
            User
          </div>
          <div className="submenu-item" onClick={() => navigate("/admin/master/kendaraan")}>
            Kendaraan
          </div>
          <div className="submenu-item" onClick={() => navigate("/admin/master/ruang")}>
            Ruangan
          </div>
        </div>

        {/* PERIZINAN */}
        <div className="menu-item" onClick={() => setLaporanOpen(!laporanOpen)}>
          <span className="menu-icon">✅</span>
          {sidebarOpen && <span>Perizinan</span>}
          {sidebarOpen && <span className={`arrow ${laporanOpen ? "rotate" : ""}`}>▾</span>}
        </div>

        <div className={`submenu ${laporanOpen ? "show" : ""}`}>
          <div className="submenu-item" onClick={() => navigate("/admin/approval/ruang")}>
            Approval Ruang
          </div>
          <div className="submenu-item" onClick={() => navigate("/admin/approval/mobil")}>
            Approval Mobil
          </div>
        </div>

        {/* MONITORING */}
        <div className="menu-item" onClick={() => setMonitoringOpen(!monitoringOpen)}>
          <span className="menu-icon">📡</span>
          {sidebarOpen && <span>Monitoring</span>}
          {sidebarOpen && <span className={`arrow ${monitoringOpen ? "rotate" : ""}`}>▾</span>}
        </div>

        <div className={`submenu ${monitoringOpen ? "show" : ""}`}>
          <div className="submenu-item" onClick={() => navigate("/admin/monitoring/ruang")}>
            Monitoring Ruang
          </div>
          <div className="submenu-item" onClick={() => navigate("/admin/monitoring/mobil")}>
            Monitoring Mobil
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSidebar;
