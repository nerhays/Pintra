import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { collection, onSnapshot, orderBy, query, limit, doc, updateDoc } from "firebase/firestore";

import logoPelindo from "../../assets/logo.png";
import profileIcon from "../../assets/profile.png";
import "./AdminLayout.css";

function AdminTopbar({ onToggleSidebar }) {
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // ✅ realtime notif dari firebase
  useEffect(() => {
    const qNotif = query(collection(db, "admin_notifications"), orderBy("createdAt", "desc"), limit(10));

    const unsub = onSnapshot(qNotif, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setNotifications(data);
    });

    return () => unsub();
  }, []);

  // ✅ close dropdown kalau klik di luar
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (notifId) => {
    try {
      const ref = doc(db, "admin_notifications", notifId);
      await updateDoc(ref, { isRead: true });
    } catch (err) {
      console.log("Gagal read notif:", err.message);
    }
  };

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="admin-topbar">
      {/* LEFT */}
      <div className="topbar-left">
        <button className="topbar-burger" onClick={onToggleSidebar}>
          ☰
        </button>

        <img src={logoPelindo} alt="PELINDO" className="topbar-logo" onClick={() => navigate("/admin")} />
      </div>

      {/* CENTER */}
      <div className="topbar-center">
        <div className="search-box">
          <input placeholder="Search..." />
        </div>
      </div>

      {/* RIGHT */}
      <div className="topbar-right">
        {/* 🔔 NOTIF */}
        <div className="notif-area" ref={notifRef}>
          <button
            className="notif-btn"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
          >
            🔔
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="notif-popup">
              <div className="notif-header">
                <b>Notifikasi</b>
              </div>

              {notifications.length === 0 ? (
                <div className="notif-empty">Belum ada notifikasi</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`notif-item ${n.isRead ? "read" : "unread"}`} onClick={() => markAsRead(n.id)}>
                    <div className="notif-title">{n.title || "Notifikasi"}</div>
                    <div className="notif-message">{n.message || "-"}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 👤 PROFILE */}
        <div className="profile-area" ref={profileRef}>
          <button
            className="profile-btn"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
          >
            <img src={profileIcon} alt="profile" className="profile-icon" />
            <span className="profile-arrow">▾</span>
          </button>

          {profileOpen && (
            <div className="profile-popup">
              <div className="profile-item" onClick={() => navigate("/home")}>
                Kembali ke Dashboard User
              </div>

              <div className="profile-item logout" onClick={logout}>
                Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminTopbar;
