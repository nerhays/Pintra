import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import "./VehicleHistoryDetail.css";

function VehicleHistoryDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [role, setRole] = useState(null);

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
      const ref = doc(db, "vehicle_bookings", bookingId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setData(snap.data());
      }
    };

    fetchRole();
    fetchDetail();
  }, [bookingId]);

  if (!data) return <div style={{ padding: 40 }}>Loading...</div>;

  const status = data.status;

  return (
    <>
      <Navbar role={role} />

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
            <b>Email Peminjam:</b> {data.emailPeminjam || data.namaPeminjam || "-"}
          </p>

          <p>
            <b>Keperluan:</b> {data.keperluan || "-"}
          </p>

          <p>
            <b>Tujuan:</b> {data.tujuan || "-"}
          </p>

          <p>
            <b>Kendaraan:</b> {data.vehicle?.nama || "-"}
          </p>

          <p>
            <b>Plat Nomor:</b> {data.vehicle?.platNomor || "-"}
          </p>

          <p>
            <b>Waktu Pinjam:</b> {data.waktuPinjam?.toDate ? data.waktuPinjam.toDate().toLocaleString("id-ID") : "-"}
          </p>

          <p>
            <b>Waktu Kembali:</b> {data.waktuKembali?.toDate ? data.waktuKembali.toDate().toLocaleString("id-ID") : "-"}
          </p>

          <p>
            <b>Status:</b> {data.status || "-"}
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
