import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import "./VehicleDetail.css";

function VehicleDetail() {
  const { vehicleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 🔒 waktu dikunci dari page sebelumnya
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const [vehicle, setVehicle] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // ROLE
      if (auth.currentUser) {
        const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
        const snap = await getDocs(q);
        if (!snap.empty) setRole(snap.docs[0].data().role);
      }

      // VEHICLE DETAIL
      const ref = doc(db, "vehicles", vehicleId);
      const snapVehicle = await getDoc(ref);
      if (!snapVehicle.exists()) return;

      setVehicle(snapVehicle.data());

      // BOOKING HISTORY
      const qBooking = query(collection(db, "vehicle_bookings"), where("vehicleId", "==", vehicleId));
      const snapBooking = await getDocs(qBooking);

      setBookings(snapBooking.docs.map((d) => d.data()));

      setLoading(false);
    };

    fetchData();
  }, [vehicleId]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!vehicle) return <div style={{ padding: 40 }}>Kendaraan tidak ditemukan</div>;

  return (
    <>
      <Navbar role={role} />

      <div className="vehicle-detail-container">
        {/* IMAGE */}
        <div className="vehicle-image-box" />

        {/* CONTENT */}
        <div className="vehicle-info-wrapper">
          <div>
            <h2>{vehicle.platNomor}</h2>
            <p>{vehicle.namaKendaraan}</p>

            <div className="vehicle-meta">
              <div className="meta-box">🚗 {vehicle.jenisKendaraan}</div>
              <div className="meta-box">⚙️ {vehicle.transmisi}</div>
              <div className="meta-box">⛽ {vehicle.jenisBBM}</div>
              <div className="meta-box">🪑 {vehicle.jumlahKursi}</div>
            </div>

            {/* JADWAL */}
            <div className="schedule">
              <h4>Jadwal Terpakai</h4>

              {bookings.length === 0 && <p className="available">Tidak ada jadwal</p>}

              {bookings.map((b, i) => (
                <div key={i} className="schedule-item">
                  {b.waktuPinjam.toDate().toLocaleString()} – {b.waktuKembali.toDate().toLocaleString()}
                  <span className="note">{b.keperluan || "Digunakan"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ACTION */}
          <div className="vehicle-action">
            <div className="status available">
              {start} – {end}
              <br />
              Tersedia
            </div>

            <button className="btn-pinjam" onClick={() => navigate(`/vehicle/${vehicleId}/form?start=${start}&end=${end}`)}>
              Pinjam
            </button>
          </div>
        </div>
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default VehicleDetail;
