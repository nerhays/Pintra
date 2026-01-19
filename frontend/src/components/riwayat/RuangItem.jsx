import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

import StatusBadge from "./StatusBadge";

function RuangItem({ item }) {
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!item?.ruang?.roomId) return;

      const ref = doc(db, "rooms", item.ruang.roomId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setRoom(snap.data());
      }
    };

    fetchRoom();
  }, [item]);

  return (
    <div className="riwayat-card clickable" onClick={() => navigate(`/riwayat/ruang/${item.id}`)}>
      <div>
        <strong>{item.namaKegiatan || "-"}</strong>

        <p>Ruang: {room?.namaRuang || "-"}</p>

        <p>
          Jam: {item.waktuMulai?.toDate ? item.waktuMulai.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"} –{" "}
          {item.waktuSelesai?.toDate ? item.waktuSelesai.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
        </p>
      </div>

      <StatusBadge status={item.status} />
    </div>
  );
}

export default RuangItem;
