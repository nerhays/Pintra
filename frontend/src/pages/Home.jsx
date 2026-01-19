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
  const [roomStat, setRoomStat] = useState({ available: 0, total: 0 });
  const [vehicleStat, setVehicleStat] = useState({ available: 0, total: 0 });

  const [bookingStat, setBookingStat] = useState({
    PENDING: 0,
    ON_GOING: 0,
    COMPLETED: 0,
    REJECTED: 0,
  });

  useEffect(() => {
    const fetchRole = async () => {
      if (!auth.currentUser) return;

      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setRole(snapshot.docs[0].data().role);
      }
    };
    const fetchDashboardData = async () => {
      const uid = auth.currentUser.uid;

      /* ===== RUANG ===== */
      const roomSnap = await getDocs(collection(db, "rooms"));
      const rooms = roomSnap.docs.map((d) => d.data());

      setRoomStat({
        total: rooms.length,
        available: rooms.filter((r) => r.status === "available").length,
      });

      /* ===== KENDARAAN ===== */
      const vehicleSnap = await getDocs(collection(db, "vehicles"));
      const vehicles = vehicleSnap.docs.map((d) => d.data());

      setVehicleStat({
        total: vehicles.length,
        available: vehicles.filter((v) => v.statusAktif === "true").length,
      });

      /* ===== BOOKING USER ===== */
      const roomBookingSnap = await getDocs(query(collection(db, "room_bookings"), where("peminjam.userId", "==", uid)));

      const vehicleBookingSnap = await getDocs(query(collection(db, "vehicle_bookings"), where("peminjamId", "==", uid)));

      const allBookings = [...roomBookingSnap.docs.map((d) => d.data()), ...vehicleBookingSnap.docs.map((d) => d.data())];

      const stat = { PENDING: 0, ON_GOING: 0, COMPLETED: 0, REJECTED: 0 };

      allBookings.forEach((b) => {
        if (stat[b.status] !== undefined) {
          stat[b.status]++;
        }
      });

      setBookingStat(stat);
    };

    fetchDashboardData();
    fetchRole();
  }, []);

  return (
    <>
      <Navbar role={role} />

      <div className="home-container">
        {/* 🔷 BANNER */}
        <img src={banner} alt="Banner" className="home-banner" />

        {/* 🔷 STATUS KETERSEDIAAN */}
        <div className="card status-card">
          <h4>
            Status Ketersediaan <span>(Live Update)</span>
          </h4>

          <div className="progress-row">
            <span>Ruang Rapat</span>
            <div className="progress">
              <div
                className="progress-fill green"
                style={{
                  width: `${(roomStat.available / roomStat.total) * 100 || 0}%`,
                }}
              />
            </div>
            <small>
              {roomStat.available} Tersedia / {roomStat.total} Total
            </small>
          </div>

          <div className="progress-row">
            <span>Kendaraan</span>
            <div className="progress">
              <div
                className="progress-fill red"
                style={{
                  width: `${(vehicleStat.available / vehicleStat.total) * 100 || 0}%`,
                }}
              />
            </div>
            <small>
              {vehicleStat.available} Tersedia / {vehicleStat.total} Total
            </small>
          </div>
        </div>

        {/* 🔷 STATUS PENGAJUAN */}
        <div className="card booking-status">
          <h4>
            Status Pengajuan <span>(My Booking)</span>
          </h4>

          <div className="status-grid">
            <StatusBox color="yellow" title="PENDING" value={`${bookingStat.PENDING} Pengajuan`} />
            <StatusBox color="blue" title="ON GOING" value={`${bookingStat.ON_GOING} Kegiatan`} />
            <StatusBox color="red" title="REJECTED" value={`${bookingStat.REJECTED} Pengajuan`} />
            <StatusBox color="green" title="COMPLETED" value={`${bookingStat.COMPLETED} Selesai`} />
          </div>
        </div>

        {/* 🔷 LAYANAN */}
        <h3 className="section-title">Layanan Kami</h3>

        <div className="service-wrapper">
          <ServiceCard image={kendaraan} onClick={() => navigate("/vehicle")} />
          <ServiceCard image={ruangan} onClick={() => navigate("/room/book")} />
          <ServiceCard image={gym} disabled />
        </div>
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

/* ===== SUB KOMPONEN ===== */

function ServiceCard({ image, onClick, disabled }) {
  return (
    <div className={`service-card ${disabled ? "disabled" : ""}`} onClick={!disabled ? onClick : undefined}>
      <img src={image} alt="service" />
      {disabled && <div className="coming-soon">COMING SOON</div>}
    </div>
  );
}

function StatusBox({ color, title, value }) {
  return (
    <div className={`status-box ${color}`}>
      <h5>{title}</h5>
      <p>{value}</p>
    </div>
  );
}

export default Home;
