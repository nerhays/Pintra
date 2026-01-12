import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import logoPelindo from "../assets/logo.png";
import profileIcon from "../assets/profile.png";
import "./Navbar.css";

function Navbar({ role }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <nav className="navbar">
      {/* LEFT */}
      <div className="navbar-left">
        <img
          src={logoPelindo}
          alt="PELINDO"
          className="navbar-logo"
          onClick={() => navigate("/home")}
        />
      </div>

      {/* RIGHT DESKTOP */}
      <div className="navbar-right desktop">
        {role === "admin" && (
          <span onClick={() => navigate("/admin")}>Dashboard Admin</span>
        )}

        {/* ➕ MENU RIWAYAT di samping Dashboard */}
        <span onClick={() => navigate("/riwayat")}>Riwayat</span>

        {/* PROFILE */}
        <div
          className="profile-wrapper"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <img src={profileIcon} alt="profile" />
          <span className="profile-email">
            {auth.currentUser?.email || "User"}
          </span>
          <span>▼</span>

          {profileOpen && (
            <div className="profile-dropdown">
              <div onClick={() => navigate("/profile")}>Profile</div>
              <div className="logout" onClick={logout}>
                Logout
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HAMBURGER (MOBILE) */}
      <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="mobile-menu">
          {role === "admin" && (
            <div onClick={() => navigate("/admin")}>Dashboard Admin</div>
          )}
          <div onClick={() => navigate("/riwayat")}>Riwayat</div>
          <div onClick={() => navigate("/profile")}>Profile</div>
          <div onClick={logout}>Logout</div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
