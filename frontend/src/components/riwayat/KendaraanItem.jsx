import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";

function KendaraanItem({ item }) {
  if (!item || !item.vehicle) return null;

  return (
    <div className="riwayat-card">
      <div>
        <strong>{item.namaKegiatan || "-"}</strong>
        <p>Mobil: {item.vehicle?.nama || "-"}</p>
        <p>Plat: {item.vehicle?.platNomor || "-"}</p>
      </div>

      <div>
        <span className={`status ${item.status?.toLowerCase() || ""}`}>{item.status || "UNKNOWN"}</span>
      </div>
    </div>
  );
}

export default KendaraanItem;
