import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AdminLayout.css";

function AdminSidebar({ sidebarOpen, mobileOpen, onCloseMobile }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [masterOpen, setMasterOpen] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(false);
  const [monitoringOpen, setMonitoringOpen] = useState(false);

  // ✅ helper active
  const isActive = (path) => location.pathname === path;

  // ✅ auto open dropdown sesuai halaman aktif (biar user ga bingung)
  useEffect(() => {
    if (location.pathname.startsWith("/admin/master")) setMasterOpen(true);
    if (location.pathname.startsWith("/admin/approval")) setLaporanOpen(true);
    if (location.pathname.startsWith("/admin/monitoring")) setMonitoringOpen(true);
  }, [location.pathname]);

  const go = (path) => {
    navigate(path);
    // ✅ kalau mobile, setelah klik menu -> sidebar auto tutup
    if (mobileOpen && onCloseMobile) onCloseMobile();
  };

  return (
    <div
      className={`admin-sidebar 
        ${sidebarOpen ? "open" : "collapsed"} 
        ${mobileOpen ? "mobile-open" : ""}`}
    >
      {/* LOGO */}
      <div className="sidebar-logo" onClick={() => go("/admin")} style={{ cursor: "pointer" }}>
        <h3>{sidebarOpen ? "ADMIN" : "A"}</h3>
      </div>

      <div className="sidebar-menu">
        {/* DASHBOARD */}
        <div className={`menu-item ${isActive("/admin") ? "active" : ""}`} onClick={() => go("/admin")}>
          <span className="menu-icon">🏠</span>
          {sidebarOpen && <span className="menu-text">Dashboard</span>}
        </div>

        {/* MASTER DATA */}
        <div className="menu-item" onClick={() => setMasterOpen(!masterOpen)}>
          <span className="menu-icon">📂</span>
          {sidebarOpen && <span className="menu-text">Master Data</span>}
          {sidebarOpen && <span className={`menu-arrow ${masterOpen ? "rotate" : ""}`}>▾</span>}
        </div>

        <div className={`submenu ${masterOpen ? "show" : ""}`}>
          <div className={`submenu-item ${isActive("/admin/master/user") ? "active-submenu" : ""}`} onClick={() => go("/admin/master/user")}>
            User
          </div>
          <div className={`submenu-item ${isActive("/admin/master/kendaraan") ? "active-submenu" : ""}`} onClick={() => go("/admin/master/kendaraan")}>
            Kendaraan
          </div>
          <div className={`submenu-item ${isActive("/admin/master/room") ? "active-submenu" : ""}`} onClick={() => go("/admin/master/room")}>
            Ruangan
          </div>
          <div className={`submenu-item ${isActive("/admin/banner-home") ? "active-submenu" : ""}`} onClick={() => go("/admin/banner-home")}>
            Banner
          </div>
        </div>

        {/* PERIZINAN */}
        <div className="menu-item" onClick={() => setLaporanOpen(!laporanOpen)}>
          <span className="menu-icon">✅</span>
          {sidebarOpen && <span className="menu-text">Approval</span>}
          {sidebarOpen && <span className={`menu-arrow ${laporanOpen ? "rotate" : ""}`}>▾</span>}
        </div>

        <div className={`submenu ${laporanOpen ? "show" : ""}`}>
          <div className={`submenu-item ${isActive("/admin/approval/ruang") ? "active-submenu" : ""}`} onClick={() => go("/admin/approval/ruang")}>
            Ruang
          </div>
          <div className={`submenu-item ${isActive("/admin/approval/kendaraan") ? "active-submenu" : ""}`} onClick={() => go("/admin/approval/kendaraan")}>
            Kendaraan
          </div>
        </div>

        {/* MONITORING */}
        <div className="menu-item" onClick={() => setMonitoringOpen(!monitoringOpen)}>
          <span className="menu-icon">📡</span>
          {sidebarOpen && <span className="menu-text">Monitoring</span>}
          {sidebarOpen && <span className={`menu-arrow ${monitoringOpen ? "rotate" : ""}`}>▾</span>}
        </div>

        <div className={`submenu ${monitoringOpen ? "show" : ""}`}>
          <div className={`submenu-item ${isActive("/admin/monitoring/ruang") ? "active-submenu" : ""}`} onClick={() => go("/admin/monitoring/ruang")}>
            Ruang
          </div>
          <div className={`submenu-item ${isActive("/admin/monitoring/kendaraan") ? "active-submenu" : ""}`} onClick={() => go("/admin/monitoring/kendaraan")}>
            kendaraan
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSidebar;
