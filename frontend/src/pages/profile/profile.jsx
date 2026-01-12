import { useEffect, useState } from "react";
import "./profile.css";
import profileIcon from "../assets/profile.png";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [profile, setProfile] = useState(null);

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    };

    fetchProfile();
  }, [user]);

  if (!profile) return <p style={{ textAlign: "center" }}>Loading...</p>;

  return (
    <div className="profile-container">
      {/* Avatar */}
      <div className="profile-avatar">
        <img src={profileIcon} alt="Profile" />
      </div>

      {/* Data */}
      <div className="profile-grid">
        <div className="profile-card">
          <span>👤</span>
          <p>{profile.name}</p>
        </div>

        <div className="profile-card">
          <span>🏢</span>
          <p>{profile.divisi}</p>
        </div>

        <div className="profile-card">
          <span>🆔</span>
          <p>{profile.nipp}</p>
        </div>

        <div className="profile-card">
          <span>💼</span>
          <p>{profile.jabatan}</p>
        </div>

        <div className="profile-card">
          <span>📧</span>
          <p>{profile.email}</p>
        </div>

        <div className="profile-card">
          <span>📱</span>
          <p>{profile.phone}</p>
        </div>
      </div>

      {/* Logout */}
      <div className="profile-logout">
        <button onClick={logout}>Keluar</button>
      </div>
    </div>
  );
}

export default Profile;
