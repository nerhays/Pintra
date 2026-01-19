import logoPelindo from "../../assets/logo.png";
import profileIcon from "../../assets/profile.png";

function AdminTopbar() {
  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <img src={logoPelindo} alt="PELINDO" className="topbar-logo" />
      </div>

      <div className="topbar-center">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input placeholder="Search" />
        </div>
      </div>

      <div className="topbar-right">
        <div className="notif-wrapper">
          <span className="notif-icon">🔔</span>
          <span className="notif-badge">6</span>
        </div>

        <div className="profile-mini">
          <img src={profileIcon} alt="profile" />
          <div className="profile-info">
            <p className="profile-name">Admin</p>
            <p className="profile-role">Admin</p>
          </div>
          <span className="profile-arrow">▾</span>
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;
