import { useNavigate } from "react-router-dom";
import "../pages/vehicle/VehicleBooking.css";

function VehicleCard({ vehicle, start, end }) {
  const navigate = useNavigate();

  return (
    <div className="vehicle-card">
      <div className="vehicle-image" />

      <div className="vehicle-info">
        <h3>
          {vehicle.platNomor} ({vehicle.nama})
        </h3>
        <p className="vehicle-spec">
          {vehicle.jenis} | {vehicle.kursi} Kursi | {vehicle.transmisi}
        </p>

        <p>
          <strong>Periode:</strong>
          <br />
          {start} – {end}
        </p>

        <button className="btn-book" onClick={() => navigate(`/vehicle/${vehicle.id}?start=${start}&end=${end}`)}>
          Booking Kendaraan Ini
        </button>
      </div>
    </div>
  );
}

export default VehicleCard;
