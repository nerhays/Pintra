import { useState } from "react";
import "./AdminLayout.css";

function AdminSidebar({ sidebarOpen, mobileOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside
      className={`admin-sidebar 
        ${sidebarOpen ? "open" : "collapsed"} 
        ${mobileOpen ? "mobile-open" : ""}`}
    >
      {/* LOGO */}
      <div className="sidebar-logo">
        <span className="logo-text">
          {sidebarOpen || mobileOpen ? "ADMIN" : "A"}
        </span>
      </div>

      {/* MENU */}
      <nav className="sidebar-menu">
        <div className="menu-item active">
          <span className="menu-icon">🏠</span>
          {(sidebarOpen || mobileOpen) && (
            <span className="menu-text">Dashboard</span>
          )}
        </div>

        <div
          className="menu-item"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="menu-icon">📂</span>

          {(sidebarOpen || mobileOpen) && (
            <>
              <span className="menu-text">Master Data</span>
              <span className={`menu-arrow ${menuOpen ? "rotate" : ""}`}>
                ▾
              </span>
            </>
          )}
        </div>

        {(sidebarOpen || mobileOpen) && (
          <div className={`submenu ${menuOpen ? "show" : ""}`}>
            <div className="submenu-item">User</div>
            <div className="submenu-item">Kendaraan</div>
            <div className="submenu-item">Ruangan</div>
          </div>
        )}

        <div className="menu-item">
          <span className="menu-icon">📊</span>
          {(sidebarOpen || mobileOpen) && (
            <span className="menu-text">Laporan</span>
          )}
        </div>
      </nav>
    </aside>
  );
}

export default AdminSidebar;
