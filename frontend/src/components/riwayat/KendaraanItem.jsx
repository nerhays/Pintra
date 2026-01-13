import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";

function KendaraanItem({ item }) {
  const navigate = useNavigate();

  if (!item || !item.vehicle) return null;

  return (
    <div className="riwayat-card clickable" onClick={() => navigate(`/riwayat/kendaraan/${item.id}`)}>
      <div>
        <strong>{item.namaKegiatan || "-"}</strong>
        <p>Mobil: {item.vehicle?.nama || "-"}</p>
        <p>Plat: {item.vehicle?.platNomor || "-"}</p>
      </div>

      <StatusBadge status={item.status} />
    </div>
  );
}

export default KendaraanItem;
