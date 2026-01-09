import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import logoPelindo from "../assets/logo.png";

function Navbar({ role }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div style={styles.navbar}>
      {/* LEFT */}
      <div style={styles.left}>
        <img src={logoPelindo} alt="PELINDO" style={styles.logo} onClick={() => navigate("/home")} />
      </div>

      {/* RIGHT */}
      <div style={styles.right}>
        {role === "admin" && (
          <span style={styles.menu} onClick={() => navigate("/admin")}>
            Dashboard Admin
          </span>
        )}

        <span style={styles.menu} onClick={() => navigate("/riwayat")}>
          Riwayat
        </span>

        {/* PROFILE DROPDOWN */}
        <div style={styles.profileWrapper}>
          <span style={styles.menu} onClick={() => setOpen(!open)}>
            👤
          </span>

          {open && (
            <div style={styles.dropdown}>
              <div
                style={styles.dropdownItem}
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
              >
                Profile
              </div>

              <div style={styles.dropdownItem} onClick={logout}>
                Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  navbar: {
    height: 64, // lebih lega
    backgroundColor: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 40px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
    position: "relative",
    zIndex: 10,
  },

  left: {},
  logo: {
    height: 32,
    cursor: "pointer",
  },
  right: {
    display: "flex",
    gap: 20,
    alignItems: "center",
  },
  menu: {
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 500,
    color: "#1f2937", // abu gelap (professional)
    letterSpacing: "0.2px",
  },
  profileWrapper: {
    position: "relative",
  },
  dropdown: {
    position: "absolute",
    top: 35,
    right: 0,
    backgroundColor: "#fff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    borderRadius: 6,
    overflow: "hidden",
    minWidth: 140,
  },
  dropdownItem: {
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: 14,
    borderBottom: "1px solid #eee",
  },
};

export default Navbar;
