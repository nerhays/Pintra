import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";

function RuangItem({ item }) {
  const navigate = useNavigate();

  return (
    <div className="riwayat-card clickable" onClick={() => navigate(`/riwayat/ruang/${item.id}`)}>
      <div>
        <strong>{item.namaKegiatan}</strong>
        <p>Ruang: {item.ruang.nama}</p>
        <p>
          Jam: {item.waktuMulai.toDate().toLocaleTimeString()} – {item.waktuSelesai.toDate().toLocaleTimeString()}
        </p>
      </div>

      <StatusBadge status={item.status} />
    </div>
  );
}

export default RuangItem;
