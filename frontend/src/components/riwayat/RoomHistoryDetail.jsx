import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import "./RoomHistoryDetail.css";

function RoomHistoryDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [data, setData] = useState(null);
  const [room, setRoom] = useState(null); // ✅ detail ruangan dari collection rooms
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!auth.currentUser) return;

      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setRole(snapshot.docs[0].data().role);
      }
    };

    const fetchDetail = async () => {
      try {
        // 1️⃣ ambil booking
        const ref = doc(db, "room_bookings", bookingId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const bookingData = snap.data();
        setData(bookingData);

        // 2️⃣ ambil detail room dari rooms/{roomId}
        const roomId = bookingData?.ruang?.roomId;
        if (roomId) {
          const roomRef = doc(db, "rooms", roomId);
          const roomSnap = await getDoc(roomRef);

          if (roomSnap.exists()) {
            setRoom(roomSnap.data());
          }
        }

        setLoading(false);
      } catch (err) {
        console.log("ERROR DETAIL:", err);
        setLoading(false);
      }
    };

    fetchRole();
    fetchDetail();
  }, [bookingId]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!data) return <div style={{ padding: 40 }}>Data booking tidak ditemukan</div>;

  return (
    <>
      <Navbar role={role} />

      <div className="detail-container">
        <button className="back-btn" onClick={() => navigate("/riwayat")}>
          ← Kembali ke Dashboard
        </button>

        <h2 className="center">Detail Peminjaman Ruang</h2>

        <div className="detail-card">
          <p>
            <b>Nama Kegiatan:</b> {data.namaKegiatan || "-"}
          </p>

          <p>
            <b>Ruangan:</b> {room?.namaRuang || "-"}
          </p>

          <p>
            <b>Lokasi:</b> {room?.lokasi || "-"}
          </p>

          <p>
            <b>Kapasitas:</b> {room?.kapasitas || "-"}
          </p>
          <p>
            <b>Peserta:</b> {data?.peserta || "-"}
          </p>
          <p>
            <b>Tanggal:</b> {data.waktuMulai?.toDate ? data.waktuMulai.toDate().toLocaleDateString() : "-"}
          </p>

          <p>
            <b>Jam:</b> {data.waktuMulai?.toDate ? data.waktuMulai.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"} -{" "}
            {data.waktuSelesai?.toDate ? data.waktuSelesai.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
          </p>

          <p>
            <b>Status:</b> {data.status || "-"}
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default RoomHistoryDetail;
