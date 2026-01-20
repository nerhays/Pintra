import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import "./AdminLayout.css";

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop collapse
  const [mobileOpen, setMobileOpen] = useState(false); // mobile open

  const toggleSidebar = () => {
    // kalau layar mobile, togglenya mobileOpen
    if (window.innerWidth <= 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  return (
    <div className="admin-layout">
      {/* ✅ overlay */}
      {mobileOpen && <div className="sidebar-overlay show" onClick={() => setMobileOpen(false)} />}

      <AdminSidebar sidebarOpen={sidebarOpen} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="admin-main">
        <AdminTopbar onToggleSidebar={toggleSidebar} />
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

export default AdminLayout;
