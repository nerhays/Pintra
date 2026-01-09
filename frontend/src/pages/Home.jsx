import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Navbar from "../components/Navbar";
import FooterOrnament from "../components/FooterOrnament";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";

import banner from "../assets/banner.png";
import kendaraan from "../assets/kendaraan.png";
import ruangan from "../assets/ruangan.png";
import gym from "../assets/gym.png";

import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (!auth.currentUser) return;

      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setRole(snapshot.docs[0].data().role);
      }
    };

    fetchRole();
  }, []);

  return (
    <>
      <Navbar role={role} />

      <div className="home-container">
        {/* BANNER */}
        <img src={banner} alt="Banner" className="home-banner" />

        {/* LAYANAN */}
        <h3 className="section-title">Layanan Kami</h3>

        {/* CARD UTAMA */}
        <div className="service-wrapper">
          <ServiceCard image={kendaraan} onClick={() => alert("Ke Peminjaman Kendaraan")} />

          <ServiceCard image={ruangan} onClick={() => navigate("/room/book")} />
        </div>
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

function ServiceCard({ image, onClick, disabled }) {
  return (
    <div className={`service-card ${disabled ? "disabled" : ""}`} onClick={!disabled ? onClick : undefined}>
      <img src={image} alt="service" className="service-image" />

      {disabled && <div className="coming-soon">COMING&nbsp;SOON</div>}
    </div>
  );
}

export default Home;
