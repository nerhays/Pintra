import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import "./RoomHistoryDetail.css";

function RoomHistoryDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      const ref = doc(db, "room_bookings", bookingId);
      const snap = await getDoc(ref);
      if (snap.exists()) setData(snap.data());
    };
    fetchDetail();
  }, [bookingId]);

  if (!data) return null;

  return (
    <>
      <Navbar />

      <div className="detail-container">
        <button className="back-btn" onClick={() => navigate("/riwayat")}>
          ← Kembali ke Dashboard
        </button>

        <h2 className="center">Detail Peminjaman Ruang</h2>

        <div className="detail-card">
          <p>
            <b>Nama Kegiatan:</b> {data.namaKegiatan}
          </p>
          <p>
            <b>Ruangan:</b> {data.ruang.nama}
          </p>
          <p>
            <b>Kapasitas:</b> {data.ruang.kapasitas}
          </p>
          <p>
            <b>Tanggal:</b> {data.waktuMulai.toDate().toLocaleDateString()}
          </p>
          <p>
            <b>Jam:</b> {data.waktuMulai.toDate().toLocaleTimeString()} - {data.waktuSelesai.toDate().toLocaleTimeString()}
          </p>
          <p>
            <b>Status:</b> {data.status}
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default RoomHistoryDetail;
