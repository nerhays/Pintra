import "./AdminLayout.css";

function AdminTopbar({ onToggleSidebar }) {
  return (
    <div className="admin-topbar">
      <button className="topbar-burger" onClick={onToggleSidebar}>
        ☰
      </button>

      <div className="topbar-center">
        <div className="search-box">
          <input placeholder="Search..." />
        </div>
      </div>

      <div className="topbar-right">
        <div className="notif-wrapper">
          🔔
          <span className="notif-badge">3</span>
        </div>

        <div className="profile-mini">
          <img src="https://i.pravatar.cc/40" alt="profile" />
          <div className="profile-info">
            <p className="profile-name">Admin</p>
            <p className="profile-role">Administrator</p>
          </div>
          <span className="profile-arrow">▾</span>
        </div>
      </div>
    </div>
  );
}

export default AdminTopbar;
