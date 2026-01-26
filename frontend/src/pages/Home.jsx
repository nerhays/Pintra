import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

import Navbar from "../components/Navbar";
import FooterOrnament from "../components/FooterOrnament";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";

import kendaraan from "../assets/kendaraan.png";
import ruangan from "../assets/ruangan.png";
import gym from "../assets/gym.png";

import BannerPopup from "../components/BannerPopup";
import "./Home.css";

function Home() {
  const navigate = useNavigate();

  const [role, setRole] = useState(null);

  const [roomStat, setRoomStat] = useState({ available: 0, total: 0 });
  const [vehicleStat, setVehicleStat] = useState({ available: 0, total: 0 });

  const [bannerData, setBannerData] = useState(null);
  const [showBannerPopup, setShowBannerPopup] = useState(false);

  // ✅ status dashboard (UI)
  const [bookingStat, setBookingStat] = useState({
    WAITING_APPROVAL: 0,
    ON_GOING: 0,
    DONE: 0,
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
      if (!auth.currentUser) return;
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
        available: vehicles.filter((v) => v.statusAktif).length,
      });

      /* ===== BOOKING USER ===== */
      const roomBookingSnap = await getDocs(query(collection(db, "room_bookings"), where("peminjam.userId", "==", uid)));

      const vehicleBookingSnap = await getDocs(query(collection(db, "vehicle_bookings"), where("peminjamId", "==", uid)));

      const allBookings = [...roomBookingSnap.docs.map((d) => d.data()), ...vehicleBookingSnap.docs.map((d) => d.data())];

      // ✅ reset stat
      const stat = {
        WAITING_APPROVAL: 0,
        ON_GOING: 0,
        DONE: 0,
        REJECTED: 0,
      };

      // ✅ mapping sesuai Firebase status
      allBookings.forEach((b) => {
        const s = b.status;

        /* =========================
           ✅ ROOM BOOKING STATUS
           WAITING_MANAGER / OPERATOR / ADMIN
           APPROVED (bisa dipakai)
           REJECTED
        ========================= */
        if (s === "WAITING_MANAGER" || s === "WAITING_OPERATOR" || s === "WAITING_ADMIN") {
          stat.WAITING_APPROVAL++;
          return;
        }

        if (s === "APPROVED") {
          // ✅ ruang sudah bisa dipakai → masuk ON_GOING
          stat.ON_GOING++;
          return;
        }

        if (s === "REJECTED") {
          stat.REJECTED++;
          return;
        }

        /* =========================
           ✅ VEHICLE BOOKING STATUS
           (sesuaikan dengan sistemmu)
        ========================= */
        if (s === "SUBMITTED" || s === "APPROVAL_1" || s === "WAITING_APPROVAL") {
          stat.WAITING_APPROVAL++;
          return;
        }

        if (s === "ON_GOING") {
          stat.ON_GOING++;
          return;
        }

        if (s === "DONE" || s === "COMPLETED") {
          stat.DONE++;
          return;
        }

        if (s === "CANCELLED") {
          stat.REJECTED++;
          return;
        }
      });

      setBookingStat(stat);
    };

    const fetchBanner = async () => {
      try {
        const ref = doc(db, "app_settings", "home_banner");
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const val = snap.data();
          setBannerData(val);

          if (val.isActive) {
            setShowBannerPopup(true);
          }
        }
      } catch (err) {
        console.error("Gagal ambil banner:", err);
      }
    };

    fetchDashboardData();
    fetchRole();
    fetchBanner();
  }, []);

  return (
    <>
      <Navbar role={role} />

      <div className="home-container">
        {/* 🔷 POPUP BANNER */}
        <BannerPopup open={showBannerPopup} bannerData={bannerData} onClose={() => setShowBannerPopup(false)} />

        {/* 🔷 STATUS KETERSEDIAAN */}
        <div className="card status-card">
          <h4>
            Status Ketersediaan <span>(Live Update)</span>
          </h4>

          <div className="availability-grid">
            {/* RUANG */}
            <div className="availability-item">
              <div className="availability-top">
                <span className="availability-title">Ruang Rapat</span>
                <span className="availability-count">
                  {roomStat.available}/{roomStat.total}
                </span>
              </div>

              <div className="progress">
                <div
                  className="progress-fill primary"
                  style={{
                    width: `${(roomStat.available / roomStat.total) * 100 || 0}%`,
                  }}
                />
              </div>

              <small>
                {roomStat.available} Aktif / {roomStat.total} Total
              </small>
            </div>

            {/* KENDARAAN */}
            <div className="availability-item">
              <div className="availability-top">
                <span className="availability-title">Kendaraan</span>
                <span className="availability-count">
                  {vehicleStat.available}/{vehicleStat.total}
                </span>
              </div>

              <div className="progress">
                <div
                  className="progress-fill secondary"
                  style={{
                    width: `${(vehicleStat.available / vehicleStat.total) * 100 || 0}%`,
                  }}
                />
              </div>

              <small>
                {vehicleStat.available} Aktif / {vehicleStat.total} Total
              </small>
            </div>
          </div>

          <p className="availability-note">*Aktif = bisa dipinjam (tidak maintenance). Ketersediaan jam dicek saat booking.</p>
        </div>

        {/* 🔷 STATUS PENGAJUAN */}
        <div className="card booking-status">
          <h4>
            Status Pengajuan <span>(My Booking)</span>
          </h4>

          <div className="status-grid">
            <StatusBox color="yellow" title="WAITING APPROVAL" value={`${bookingStat.WAITING_APPROVAL} Pengajuan`} />
            <StatusBox color="blue" title="ON GOING" value={`${bookingStat.ON_GOING} Kegiatan`} />
            <StatusBox color="red" title="REJECTED" value={`${bookingStat.REJECTED} Pengajuan`} />
            <StatusBox color="green" title="DONE" value={`${bookingStat.DONE} Selesai`} />
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
