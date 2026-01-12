import StatusBadge from "./StatusBadge";

function RuangItem({ item }) {
  return (
    <div className="riwayat-card">
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
