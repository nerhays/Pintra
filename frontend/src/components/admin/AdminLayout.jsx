import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import "./AdminLayout.css";

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(!mobileOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-overlay show"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="admin-layout">
        <AdminSidebar
          sidebarOpen={sidebarOpen}
          mobileOpen={mobileOpen}
        />

        <div className="admin-main">
          <AdminTopbar onToggleSidebar={toggleSidebar} />
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </>
  );
}

export default AdminLayout;
