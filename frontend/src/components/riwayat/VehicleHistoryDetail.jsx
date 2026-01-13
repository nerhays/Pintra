import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import "./VehicleHistoryDetail.css";

function VehicleHistoryDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      const ref = doc(db, "vehicle_bookings", bookingId);
      const snap = await getDoc(ref);
      if (snap.exists()) setData(snap.data());
    };
    fetchDetail();
  }, [bookingId]);

  if (!data) return null;

  const { status } = data;

  return (
    <>
      <Navbar />

      <div className="detail-container">
        <button className="back-btn" onClick={() => navigate("/riwayat")}>
          ← Kembali ke Dashboard
        </button>

        {/* STATUS */}
        <div className="status-box">
          {status === "COMPLETED" && <h2 className="success">✔ Peminjaman Telah Selesai!</h2>}
          {status === "ON_GOING" && <h2 className="warning">⚠ Kendaraan Sedang Dipinjam</h2>}
          {status === "APPROVED" && <h2 className="info">🚗 Kendaraan Siap Digunakan</h2>}
          {status === "SUBMITTED" && <h2 className="pending">⏳ Menunggu Persetujuan</h2>}
        </div>

        {/* CARD DETAIL */}
        <div className="detail-card">
          <p>
            <b>Nama Peminjam:</b> {data.namaPeminjam}
          </p>
          <p>
            <b>Keperluan:</b> {data.keperluan}
          </p>
          <p>
            <b>Tujuan:</b> {data.tujuan}
          </p>
          <p>
            <b>Kendaraan:</b> {data.vehicle.nama}
          </p>
          <p>
            <b>Plat Nomor:</b> {data.vehicle.platNomor}
          </p>
          <p>
            <b>Jam Pinjam:</b> {data.waktuPinjam}
          </p>
          <p>
            <b>Jam Kembali:</b> {data.waktuKembali}
          </p>
        </div>

        {/* ACTION */}
        {status === "APPROVED" && (
          <button className="action-btn" onClick={() => navigate(`/vehicle/${bookingId}/checkout`)}>
            Isi Pengecekan Kendaraan
          </button>
        )}

        {status === "ON_GOING" && (
          <button className="action-btn danger" onClick={() => navigate(`/vehicle/${bookingId}/checkin`)}>
            Kembalikan Kendaraan
          </button>
        )}
      </div>

      <Footer />
    </>
  );
}

export default VehicleHistoryDetail;
