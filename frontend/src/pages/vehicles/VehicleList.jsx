import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";

function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicles = async () => {
      const snap = await getDocs(collection(db, "vehicles"));
      setVehicles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchVehicles();
  }, []);

  return (
    <>
      <Navbar />

      <div className="page-container">
        <h2>Peminjaman Kendaraan</h2>

        <div className="grid">
          {vehicles.map((v) => (
            <div key={v.id} className="vehicle-card" onClick={() => navigate(`/vehicle/${v.id}`)}>
              <div className="image-placeholder" />
              <strong>{v.platNomor}</strong>
              <p>{v.nama}</p>
              <span className={v.status === "available" ? "available" : "booked"}>{v.status}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default VehicleList;
