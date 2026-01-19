import { useState } from "react";
import "./AdminLayout.css";

function AdminSidebar({ sidebarOpen, mobileOpen }) {
  const [masterOpen, setMasterOpen] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(false);

  return (
    <div
      className={`admin-sidebar 
        ${sidebarOpen ? "open" : "collapsed"} 
        ${mobileOpen ? "open" : ""}`}
    >
      {/* LOGO */}
      <div className="sidebar-logo">
        <h3>{sidebarOpen ? "ADMIN" : "A"}</h3>
      </div>

      <div className="sidebar-menu">
        {/* DASHBOARD */}
        <div className="menu-item active">
          <span className="menu-icon">🏠</span>
          {sidebarOpen && <span>Dashboard</span>}
        </div>

        {/* MASTER DATA */}
        <div
          className="menu-item"
          onClick={() => setMasterOpen(!masterOpen)}
        >
          <span className="menu-icon">📂</span>
          {sidebarOpen && <span>Master Data</span>}
          {sidebarOpen && (
            <span className={`arrow ${masterOpen ? "rotate" : ""}`}>▾</span>
          )}
        </div>

        <div className={`submenu ${masterOpen ? "show" : ""}`}>
          <div className="submenu-item">User</div>
          <div className="submenu-item">Kendaraan</div>
          <div className="submenu-item">Ruangan</div>
        </div>

        {/* LAPORAN */}
        <div
          className="menu-item"
          onClick={() => setLaporanOpen(!laporanOpen)}
        >
          <span className="menu-icon">📊</span>
          {sidebarOpen && <span>Perizinan</span>}
          {sidebarOpen && (
            <span className={`arrow ${laporanOpen ? "rotate" : ""}`}>▾</span>
          )}
        </div>

        <div className={`submenu ${laporanOpen ? "show" : ""}`}>
          <div className="submenu-item">Approval Ruang</div>
          <div className="submenu-item">Approval Mobil</div>
        </div>
      </div>
    </div>
  );
}

export default AdminSidebar;
