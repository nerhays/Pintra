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

  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const [vehicle, setVehicle] = useState(null);
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
      if (!snapVehicle.exists()) {
        setLoading(false);
        return;
      }

      setVehicle(snapVehicle.data());
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

        <div className="vehicle-info-wrapper">
          {/* INFO */}
          <div>
            <h2>{vehicle.platNomor}</h2>
            <p>{vehicle.nama}</p>

            {/* META / FASILITAS */}
            <div className="vehicle-meta">
              <div className="meta-box">🚗 {vehicle.jenis}</div>
              <div className="meta-box">⚙️ {vehicle.transmisi}</div>
              <div className="meta-box">⛽ {vehicle.bbm}</div>
              <div className="meta-box">🪑 {vehicle.kursi}</div>
            </div>

            {/* STATUS TERSEDIA (PINDAH KE SINI) */}
            <div className="status available status-inline">
              {start} – {end}
              <br />
              <strong>Tersedia</strong>
            </div>
          </div>

          {/* ACTION */}
          <div className="vehicle-action">
            <button
              className="btn-pinjam"
              onClick={() =>
                navigate(`/vehicle/${vehicleId}/form?start=${start}&end=${end}`)
              }
            >
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
