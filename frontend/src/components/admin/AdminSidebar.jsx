import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminSidebar() {
  const navigate = useNavigate();

  const [openMenu, setOpenMenu] = useState({
    manajemen: false,
    monitoring: false,
  });

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-logo">
        <button className="burger-btn">☰</button>
      </div>

      <div className="sidebar-menu">
        {/* DASHBOARD */}
        <div className="menu-item active" onClick={() => navigate("/admin")}>
          <span className="menu-icon">▦</span>
          <span>Dashboard</span>
        </div>

        {/* MANAJEMEN */}
        <div className="menu-item" onClick={() => setOpenMenu((prev) => ({ ...prev, manajemen: !prev.manajemen }))}>
          <span className="menu-icon">👤</span>
          <span>Manajemen</span>
        </div>

        {openMenu.manajemen && (
          <div className="submenu">
            <div className="submenu-item" onClick={() => navigate("/admin/users")}>
              • User
            </div>
            <div className="submenu-item" onClick={() => navigate("/admin/rooms")}>
              • Ruang
            </div>
            <div className="submenu-item" onClick={() => navigate("/admin/vehicles")}>
              • Kendaraan
            </div>
          </div>
        )}

        {/* MONITORING */}
        <div className="menu-item" onClick={() => setOpenMenu((prev) => ({ ...prev, monitoring: !prev.monitoring }))}>
          <span className="menu-icon">🖥</span>
          <span>Monitoring</span>
        </div>

        {openMenu.monitoring && (
          <div className="submenu">
            <div className="submenu-item" onClick={() => navigate("/admin/approval-ruang")}>
              • Approval Ruang
            </div>
            <div className="submenu-item" onClick={() => navigate("/admin/approval-mobil")}>
              • Approval Mobil
            </div>
            <div className="submenu-item" onClick={() => navigate("/admin/kegiatan")}>
              • Kegiatan
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default AdminSidebar;
