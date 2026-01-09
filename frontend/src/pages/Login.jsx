import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [nipp, setNipp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!nipp || !password) {
      alert("NIPP dan Password wajib diisi");
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ Cari user berdasarkan NIPP
      const q = query(collection(db, "users"), where("nipp", "==", nipp));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert("NIPP tidak terdaftar");
        setLoading(false);
        return;
      }

      const userData = snapshot.docs[0].data();

      // 2️⃣ Login Firebase Auth pakai EMAIL
      await signInWithEmailAndPassword(auth, userData.email, password);

      // 3️⃣ Redirect ke HOME (admin & user sama)
      navigate("/home");
    } catch (error) {
      console.error(error);
      alert("Login gagal, cek NIPP / password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* LOGO */}
        <div style={styles.logoWrapper}>
          <img src="/pintra-logo.png" alt="Pintra" style={styles.logo} />
        </div>

        {/* CARD */}
        <div style={styles.card}>
          <h3 style={styles.title}>Login</h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <label style={styles.label}>NIPP</label>
            <input type="text" value={nipp} onChange={(e) => setNipp(e.target.value)} style={styles.input} />

            <label style={styles.label}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />

            <div style={styles.forgot}>Lupa Password</div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Loading..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
const styles = {
  wrapper: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
  },

  container: {
    width: "100%",
    maxWidth: 420,
    textAlign: "center",
  },

  logoWrapper: {
    marginBottom: 20,
  },

  logo: {
    width: 90,
    margin: "0 auto",
    display: "block",
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 32,
    borderRadius: 8,
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    textAlign: "left",
  },

  title: {
    marginBottom: 20,
    fontWeight: 600,
  },

  label: {
    fontSize: 14,
    marginBottom: 6,
    display: "block",
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    marginBottom: 16,
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 14,
    boxSizing: "border-box",
  },

  forgot: {
    fontSize: 12,
    color: "#666",
    marginBottom: 16,
    cursor: "pointer",
  },

  button: {
    width: "100%",
    padding: "10px",
    borderRadius: 4,
    border: "1px solid #333",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontWeight: 500,
  },
};

export default Login;
