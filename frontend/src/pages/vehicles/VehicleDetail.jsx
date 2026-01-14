import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

function VehicleDetail() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      const snap = await getDoc(doc(db, "vehicles", vehicleId));
      if (snap.exists()) setVehicle(snap.data());
    };
    fetchDetail();
  }, [vehicleId]);

  if (!vehicle) return <p>Loading...</p>;

  return (
    <>
      <Navbar />

      <div className="detail-container">
        <div className="detail-image" />

        <h2>{vehicle.platNomor}</h2>
        <p>{vehicle.nama}</p>

        <div className="spec-grid">
          <div>Jenis: {vehicle.jenis}</div>
          <div>Transmisi: {vehicle.transmisi}</div>
          <div>BBM: {vehicle.bbm}</div>
          <div>Kursi: {vehicle.kursi}</div>
        </div>

        <button disabled={vehicle.status !== "available"} onClick={() => navigate(`/vehicle/${vehicleId}/book`)}>
          Pinjam
        </button>
      </div>
    </>
  );
}

export default VehicleDetail;
