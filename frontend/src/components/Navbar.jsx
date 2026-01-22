import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

import logoPelindo from "../assets/logo.png";
import profileIcon from "../assets/profile.png";
import "./Navbar.css";

function Navbar({ role: roleProp }) {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // ✅ ambil role & jabatan dari Firestore (biar manager bisa kebaca)
  const [role, setRole] = useState(roleProp || null);
  const [jabatan, setJabatan] = useState(null);

  useEffect(() => {
    const fetchRoleAndJabatan = async () => {
      try {
        if (!auth.currentUser) return;

        const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const userData = snap.docs[0].data();
          setRole(userData.role || roleProp || "user");
          setJabatan((userData.jabatan || "").toLowerCase());
        }
      } catch (err) {
        console.error("❌ Navbar fetch role/jabatan error:", err);
      }
    };

    fetchRoleAndJabatan();
  }, [roleProp]);

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // ✅ helper permission
  const isAdminPanel = role === "admin" || role === "operator";
  const isManager = jabatan === "manager";

  return (
    <nav className="navbar">
      {/* LEFT */}
      <div className="navbar-left">
        <img src={logoPelindo} alt="PELINDO" className="navbar-logo" onClick={() => navigate("/home")} />
      </div>

      {/* RIGHT DESKTOP */}
      <div className="navbar-right desktop">
        {/* ✅ ADMIN / OPERATOR */}
        {isAdminPanel && <span onClick={() => navigate("/admin")}>Dashboard Admin</span>}

        {/* ✅ MANAGER APPROVAL */}
        {isManager && <span onClick={() => navigate("/approval/manager/ruang")}>Approval Ruangan</span>}
        {isManager && <span onClick={() => navigate("/manager/approval/kendaraan")}>Approval Kendaraan</span>}
        {/* RIWAYAT */}
        <span onClick={() => navigate("/riwayat")}>Riwayat</span>

        {/* PROFILE */}
        <div className="profile-wrapper" onClick={() => setProfileOpen(!profileOpen)}>
          <img src={profileIcon} alt="profile" />
          <span className="profile-email">{auth.currentUser?.email || "User"}</span>
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
          {isAdminPanel && <div onClick={() => navigate("/admin")}>Dashboard Admin</div>}

          {isManager && <div onClick={() => navigate("/approval/manager/ruang")}>Approval Ruangan</div>}
          {isManager && <div onClick={() => navigate("/manager/approval/kendaraan")}>Approval Kendaraan</div>}

          <div onClick={() => navigate("/riwayat")}>Riwayat</div>
          <div onClick={() => navigate("/profile")}>Profile</div>
          <div onClick={logout}>Logout</div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
